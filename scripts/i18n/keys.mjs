// Mengumpulkan semua kunci terjemahan yang dipakai kode: t("..."), data modul (tur, panduan, konstanta), dan pesan server.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { analyze } from "./analyze.mjs";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const norm = (s) => s.replace(/\s+/g, " ").trim();
const hasLetters = (s) => /\p{L}/u.test(s);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const strOf = (n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : null);

// Teks dari template dengan ${} diganti {nama}; dipakai untuk pesan server dinamis
function templateKey(n) {
  if (!ts.isTemplateExpression(n)) return null;
  let key = n.head.text;
  n.templateSpans.forEach((sp, i) => { key += `{v${i + 1}}${sp.literal.text}`; });
  return key;
}

export function collectKeys(root) {
  const used = new Map();   // kunci -> berkas
  const dynamic = [];       // pesan server berupa template (tidak bisa diterjemahkan di klien)
  const add = (k, f) => { const n = norm(k); if (n && hasLetters(n) && !used.has(n)) used.set(n, f); };

  for (const abs of walk(path.join(root, "src"))) {
    const rel = path.relative(root, abs).replace(/\\/g, "/");
    if (rel.startsWith("src/i18n/")) continue;
    const text = fs.readFileSync(abs, "utf8");
    const sf = parse(rel, text);

    // 1) t("...") literal
    (function w(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.name === undefined && n.expression.text === "t" && n.arguments[0]) {
        const s = strOf(n.arguments[0]);
        if (s != null) add(s, rel);
      }
      ts.forEachChild(n, w);
    })(sf);

    // 2) data modul: konten tur, panduan, konstanta berlabel
    if (/^src\/content\/(tours|panduan)\.ts$/.test(rel)) {
      (function w(n) {
        if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && ["title", "body", "cta"].includes(n.name.text)) { const s = strOf(n.initializer); if (s) add(s, rel); }
        ts.forEachChild(n, w);
      })(sf);
    }
    if (rel === "src/lib/constants.ts") {
      (function w(n) {
        if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === "label") { const s = strOf(n.initializer); if (s) add(s, rel); }
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && ["ROLE_LABEL", "CODE_ERROR_MESSAGES"].includes(n.name.text) && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
          for (const p of n.initializer.properties) if (ts.isPropertyAssignment(p)) { const s = strOf(p.initializer); if (s) add(s, rel); }
        }
        ts.forEachChild(n, w);
      })(sf);
    }

    // 3) pesan dari server: fail("..."), message/error: "...", new Error("...")
    if (/^src\/(features|app\/api|lib\/(upload|payments|google|storage|result))/.test(rel) || /actions\.ts$/.test(rel)) {
      (function w(n) {
        const grab = (arg) => {
          const s = strOf(arg);
          if (s != null) { if (!/^[A-Z_]+$/.test(s)) add(s, rel); return; }
          const tk = templateKey(arg);
          if (tk && hasLetters(tk.replace(/\{v\d+\}/g, ""))) dynamic.push(`${rel}: ${norm(tk).slice(0, 110)}`);
        };
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["fail"].includes(n.expression.text) && n.arguments[0]) grab(n.arguments[0]);
        if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "Error" && n.arguments?.[0]) grab(n.arguments[0]);
        if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && ["message", "error"].includes(n.name.text)) grab(n.initializer);
        ts.forEachChild(n, w);
      })(sf);
    }

    // 4) teks di luar komponen (modul): daftar, peta label, dll.
    const r = analyze(rel, text, { transform: false });
    for (const o of r.orphans) add(o.text, rel);
  }
  return { used, dynamic };
}
