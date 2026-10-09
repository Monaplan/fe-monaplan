// Analisis AST untuk i18n: menemukan teks pengguna yang belum dibungkus t(...) dan, bila diminta, membuat suntingan untuk membungkusnya.
// Dipakai oleh codemod (scripts/i18n/codemod.mjs) dan oleh uji (scripts/test-i18n.mjs).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const ATTRS = new Set(["context", "title", "description", "subtitle", "help", "text", "placeholder", "label", "aria-label", "alt", "confirmText", "successMessage", "body", "emptyText", "cta", "tooltip"]);
const PROPS = new Set(["q", "a", "rule", "label", "title", "description", "text", "body", "confirm", "confirmLabel", "cancelLabel", "placeholder", "message", "subtitle", "help"]);
const CALLS = new Set(["toast", "setError", "setPayError", "confirm", "prompt"]);
const FORMAT_FNS = { formatDateLong: 2, formatDateShort: 2, formatDateCompact: 2, formatTime: 3, relativeDay: 2 };

const hasLetters = (s) => /\p{L}/u.test(s);
const looksLikeText = (s) => {
  const t = s.trim();
  if (!hasLetters(t)) return false;
  if (/^(Monaplan|M)$/.test(t)) return false; // nama merek tidak diterjemahkan
  if (/^(https?:|\/|#|\.|@[\w-]+$)/.test(t) || /^\S+@\S+$/.test(t)) return false;
  if (/^[a-z0-9_.:-]+$/.test(t)) return false; // pengenal, kelas CSS, nilai enum
  return true;
};
const norm = (s) => s.replace(/\s+/g, " ").trim();
const q = (s) => JSON.stringify(s);

const isFn = (n) => ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n);
function fnName(n) {
  if (ts.isFunctionDeclaration(n) && n.name) return n.name.text;
  const p = n.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return null;
}

export function analyze(file, text, { transform = true } = {}) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const first = sf.statements[0];
  const directive = first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) ? first.expression.text : null;
  const isClient = directive === "use client";
  const isServerActions = directive === "use server";
  const out = { file, isClient, isServerActions, edits: [], keys: [], orphans: [], mixed: [], comps: new Map(), notAsync: new Set() };
  if (isServerActions) return out;

  const outerComponent = (node) => {
    let cur = node.parent, found = null;
    while (cur) { if (isFn(cur)) { const name = fnName(cur); if (name && /^[A-Z]/.test(name)) found = cur; } cur = cur.parent; }
    return found;
  };
  const useIn = (node, flag) => {
    const comp = outerComponent(node);
    if (!comp) return false;
    const cur = out.comps.get(comp) ?? { t: false, lang: false };
    cur[flag] = true;
    out.comps.set(comp, cur);
    return true;
  };
  const srcOf = (n) => text.slice(n.getStart(sf), n.getEnd());
  // Teks ekspresi dengan arg bahasa untuk pemanggilan format tanggal di dalamnya (dipakai saat ekspresi dipindah menjadi parameter t)
  const srcWithLang = (n) => {
    const ins = [];
    (function w(x) {
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text in FORMAT_FNS) {
        const pos = FORMAT_FNS[x.expression.text];
        if (x.arguments.length < pos + 1 && useIn(n, "lang")) {
          const fill = Array.from({ length: pos - x.arguments.length }, () => "undefined");
          ins.push({ at: x.end - 1 - n.getStart(sf), text: `${x.arguments.length ? ", " : ""}${[...fill, "lang"].join(", ")}` });
        }
      }
      ts.forEachChild(x, w);
    })(n);
    let t = srcOf(n);
    for (const i of ins.sort((a, b) => b.at - a.at)) t = t.slice(0, i.at) + i.text + t.slice(i.at);
    return t;
  };
  const paramName = (e, i, used) => {
    let name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : `v${i + 1}`;
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) {
      const f = e.expression.text;
      name = /^formatDate/.test(f) ? "date" : f === "formatTime" ? "time" : f === "relativeDay" ? "when" : f === "formatIDR" ? "amount" : f === "formatIDRShort" ? "amount" : `v${i + 1}`;
    }
    if (!/^\w+$/.test(name) || used.has(name)) name = `v${i + 1}`;
    used.add(name);
    return name;
  };

  // Ubah literal atau template menjadi { key, params } (null bila bukan teks pengguna)
  function toKey(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const k = norm(node.text);
      return looksLikeText(k) ? { key: k, params: [] } : null;
    }
    if (ts.isTemplateExpression(node)) {
      let key = node.head.text; const params = []; const used = new Set();
      node.templateSpans.forEach((sp, i) => {
        const name = paramName(sp.expression, i, used);
        params.push([name, srcWithLang(sp.expression)]);
        key += `{${name}}${sp.literal.text}`;
      });
      key = norm(key);
      return looksLikeText(key.replace(/\{\w+\}/g, "")) ? { key, params } : null;
    }
    return null;
  }
  const call = ({ key, params }) => `t(${q(key)}${params.length ? `, { ${params.map(([n, e]) => (n === e ? n : `${n}: ${e}`)).join(", ")} }` : ""})`;
  const wrap = (node, k) => {
    if (!k) return false;
    if (!useIn(node, "t")) { out.orphans.push({ text: k.key, at: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 }); return false; }
    out.edits.push({ start: node.getStart(sf), end: node.getEnd(), text: call(k) });
    out.keys.push(k.key);
    return true;
  };
  const wrapInExpr = (node, k) => { // di dalam {...}: literal diganti langsung
    return wrap(node, k);
  };

  // Teks dalam ekspresi JSX: literal di cabang kondisi / && / || / ??
  function visitExprText(node) {
    if (ts.isParenthesizedExpression(node)) return visitExprText(node.expression);
    if (ts.isConditionalExpression(node)) { visitExprText(node.whenTrue); visitExprText(node.whenFalse); return; }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) visitExprText(node.left);
      visitExprText(node.right);
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      const k = toKey(node);
      if (k) wrapInExpr(node, k);
    }
  }

  // Ekspresi yang aman dijadikan parameter: tanpa JSX, tanpa literal teks, dan tanpa pemanggilan format tanggal (butuh arg bahasa)
  const isSimpleExpr = (e) => {
    const src = srcOf(e);
    if (/<[A-Za-z>]/.test(src)) return false;
    if (/\b(formatDate\w+|formatTime|relativeDay)\(/.test(src)) return false;
    if (/["'`][^"'`]*\p{L}[^"'`]*["'`]/u.test(src)) return false;
    return true;
  };

  function handleChildren(node) {
    const kids = node.children;
    const texts = kids.filter((c) => ts.isJsxText(c) && looksLikeText(norm(c.text)));
    if (!texts.length) return false;
    const hasElems = kids.some((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxFragment(c));
    const exprs = kids.filter((c) => ts.isJsxExpression(c));
    if (!hasElems && exprs.every((e) => e.expression && isSimpleExpr(e.expression) && !ts.isJsxElement(e.expression))) {
      // Kalimat utuh: gabungkan teks dan ekspresi menjadi satu kunci
      let key = ""; const params = []; const used = new Set();
      for (const c of kids) {
        if (ts.isJsxText(c)) key += c.text.replace(/\s+/g, " ");
        else {
          const e = c.expression;
          if (!e) continue;
          if ((ts.isStringLiteral(e)) && e.text === " ") { key += " "; continue; }
          const name = paramName(e, params.length, used);
          params.push([name, srcWithLang(e)]); key += `{${name}}`;
        }
      }
      const k = { key: key.replace(/\s+/g, " ").trim(), params };
      if (!k.key || !looksLikeText(k.key.replace(/\{\w+\}/g, ""))) return false;
      const start = kids[0].getStart(sf), end = kids[kids.length - 1].getEnd();
      if (!useIn(node, "t")) { out.orphans.push({ text: k.key, at: sf.getLineAndCharacterOfPosition(start).line + 1 }); return true; }
      out.edits.push({ start: kids[0].pos, end: kids[kids.length - 1].end, text: `{${call(k)}}` });
      out.keys.push(k.key);
      // anak ekspresi di dalam sudah dipakai sebagai parameter: jangan ditelusuri lagi
      return true;
    }
    // Campuran dengan elemen: terjemahkan potongan teks satu per satu dan tandai untuk ditinjau
    out.mixed.push({ at: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: norm(texts.map((t) => t.text).join(" | ")).slice(0, 90) });
    for (const c of texts) {
      const raw = c.text;
      const key = norm(raw);
      if (!key || !looksLikeText(key)) continue;
      const lead = /^[ \t]+\S/.test(raw);
      const trail = /\S[ \t]+$/.test(raw);
      if (!useIn(node, "t")) { out.orphans.push({ text: key, at: 0 }); continue; }
      out.edits.push({ start: c.pos, end: c.end, text: `${lead ? '{" "}' : ""}{${call({ key, params: [] })}}${trail ? '{" "}' : ""}` });
      out.keys.push(key);
    }
    return false; // lanjut menelusuri elemen anak
  }

  function visit(node) {
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && handleChildren(node)) return;

    if (ts.isJsxAttribute(node) && node.initializer && ATTRS.has(node.name.getText(sf))) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) {
        const k = toKey(init);
        if (k && useIn(node, "t")) { out.edits.push({ start: init.getStart(sf), end: init.getEnd(), text: `{${call(k)}}` }); out.keys.push(k.key); }
        else if (k) out.orphans.push({ text: k.key, at: sf.getLineAndCharacterOfPosition(init.getStart(sf)).line + 1 });
        return;
      }
      if (ts.isJsxExpression(init) && init.expression) { visitExprText(init.expression); }
    }
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
      visitExprText(node.expression);
    }
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && PROPS.has(node.name.text)) {
      const k = toKey(node.initializer);
      if (k) { wrap(node.initializer, k); }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && CALLS.has(node.expression.text) && node.arguments[0]) {
      const k = toKey(node.arguments[0]);
      if (k) wrap(node.arguments[0], k);
    }
    // Format tanggal: teruskan bahasa
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text in FORMAT_FNS) {
      const pos = FORMAT_FNS[node.expression.text];
      const args = node.arguments;
      if (args.length < pos + 1 && useIn(node, "lang")) {
        const fill = Array.from({ length: pos - args.length }, () => "undefined");
        const closeParen = node.end - 1;
        out.edits.push({ start: closeParen, end: closeParen, text: `${args.length ? ", " : ""}${[...fill, "lang"].join(", ")}` });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // Susun suntingan tanpa tumpang tindih (yang lebih luas menang)
  out.edits.sort((a, b) => a.start - b.start || b.end - a.end);
  const clean = [];
  for (const e of out.edits) {
    const last = clean[clean.length - 1];
    if (last && e.start < last.end && !(e.start === e.end)) continue;
    // sisipan nol-panjang yang jatuh di dalam penggantian lain dibuang (sudah ikut dalam teks pengganti)
    if (last && last.end > last.start && e.start === e.end && e.start > last.start && e.start < last.end) continue;
    clean.push(e);
  }
  out.edits = clean;

  if (!transform) return out;
  return { ...out, sf, ts, directive };
}

// Terapkan suntingan, suntik hook dan impor. Mengembalikan teks baru.
export function applyEdits(file, text, res) {
  const { sf, ts: _ts } = res;
  let edits = [...res.edits];
  const importAdds = new Set();
  const notAsync = [];

  for (const [fn, flags] of res.comps) {
    const body = fn.body;
    if (!body) continue;
    // Hook sudah ada dari putaran sebelumnya: jangan disuntik lagi
    if (ts.isBlock(body) && /(useT|useI18n)()|getI18n()/.test(body.getText(sf).slice(0, 400))) continue;
    const lines = [];
    if (res.isClient) {
      lines.push(flags.lang ? "const { t, lang } = useI18n();" : "const t = useT();");
      importAdds.add(flags.lang ? "import { useI18n } from \"@/i18n/client\";" : "import { useT } from \"@/i18n/client\";");
    } else {
      lines.push(`const { t${flags.lang ? ", lang" : ""} } = await getI18n();`);
      importAdds.add("import { getI18n } from \"@/i18n/server\";");
      const isAsync = fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (!isAsync) {
        notAsync.push(fn);
        const at = ts.isFunctionDeclaration(fn)
          ? fn.getStart(sf) + (fn.modifiers ? text.slice(fn.getStart(sf)).search(/\bfunction\b/) : 0)
          : fn.getStart(sf);
        edits.push({ start: at, end: at, text: "async " });
      }
    }
    if (ts.isBlock(body)) {
      edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `\n  ${lines.join("\n  ")}` });
    } else {
      // Arrow dengan badan ekspresi: ubah menjadi blok
      // Dua sisipan terpisah (bukan mengganti seluruh badan) agar suntingan di dalamnya tetap berlaku
      edits.push({ start: body.getStart(sf), end: body.getStart(sf), text: `{\n  ${lines.join("\n  ")}\n  return ` });
      edits.push({ start: body.getEnd(), end: body.getEnd(), text: `;\n}` });
    }
  }

  // Impor ditambahkan setelah impor terakhir
  const imports = sf.statements.filter((s) => ts.isImportDeclaration(s));
  const have = (imp) => text.includes(imp.slice(0, imp.indexOf(" from")));
  const adds = [...importAdds].filter((i) => !text.includes(i));
  if (adds.length) {
    const at = imports.length ? imports[imports.length - 1].end : (sf.statements[0]?.end ?? 0);
    edits.push({ start: at, end: at, text: `\n${adds.join("\n")}` });
  }
  void have;

  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { text: out, notAsync: notAsync.length };
}
