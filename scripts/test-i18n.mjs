// Uji terjemahan: semua kunci yang dipakai kode ada di kamus Inggris, parameter {x} sama, tidak ada teks mentah yang lolos.
// Jalankan: npm run test:i18n
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { collectKeys } from "./i18n/keys.mjs";
import { analyze } from "./i18n/analyze.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Muat kamus EN dengan transpilasi sementara
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mp-i18n-"));
for (const rel of ["en.ts", "en/part1.ts", "en/part2.ts", "en/part3.ts", "en/part4.ts", "en/part5.ts", "en/part6.ts", "en/part7.ts", "en/part8.ts"]) {
  const src = fs.readFileSync(path.join(ROOT, "src/i18n", rel), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.mjs"');
  const dest = path.join(tmp, rel.replace(/\.ts$/, ".mjs"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, js);
}
const { EN } = await import(pathToFileURL(path.join(tmp, "en.mjs")).href);

let pass = 0, bad = 0;
const check = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS", name); } else { bad++; console.log("  FAIL", name, extra); } };

const { used, dynamic } = collectKeys(ROOT);
console.log(`Kunci terpakai: ${used.size} | entri kamus: ${Object.keys(EN).length}`);

const missing = [...used.keys()].filter((k) => !(k in EN));
check("setiap kunci yang dipakai kode ada di kamus Inggris", missing.length === 0, `\n     hilang (${missing.length}):\n     - ${missing.slice(0, 200).join("\n     - ")}`);

const holders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const mismatched = Object.entries(EN).filter(([k, v]) => holders(k) !== holders(v));
check("parameter {x} sama di teks sumber dan terjemahan", mismatched.length === 0, `\n     ${mismatched.slice(0, 10).map(([k]) => k).join("\n     ")}`);

const empty = Object.entries(EN).filter(([, v]) => !String(v).trim());
check("tidak ada terjemahan kosong", empty.length === 0, empty.map(([k]) => k).join(" | "));

const noPlaceholderLeak = Object.entries(EN).filter(([, v]) => /&(quot|amp|nbsp|lt|gt);/.test(v));
check("tidak ada entitas HTML mentah di terjemahan", noPlaceholderLeak.length === 0);

// Teks mentah di dalam komponen yang belum dibungkus t(): analisis tanpa transformasi tidak boleh menemukan suntingan
const SKIP = [/^src\/i18n\//, /^src\/lib\/email/, /^src\/content\//, /^src\/lib\/format\.ts$/, /^src\/lib\/constants\.ts$/, /^src\/lib\/seo\.ts$/, /^src\/app\/privasi\//, /^src\/app\/rsvp\//, /^src\/app\/\[slug\]\//, /^src\/components\/rsvp\//, /rsvp-theme-picker\.tsx$/, /^src\/app\/api\//, /opengraph-image|apple-icon|\/icon\.tsx$|manifest|sitemap|robots/, /^src\/lib\/pdf\//];
const raw = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const rel = path.relative(ROOT, p).replace(/\\/g, "/");
      if (SKIP.some((r) => r.test(rel))) continue;
      const r = analyze(rel, fs.readFileSync(p, "utf8"), { transform: false });
      for (const ed of r.edits) if (ed.text.startsWith("{t(") || ed.text.startsWith("t(")) raw.push(`${rel}: ${ed.text.slice(0, 70)}`);
    }
  }
})(path.join(ROOT, "src"));
check("tidak ada teks pengguna mentah di komponen (semua dibungkus t())", raw.length === 0, `\n     ${raw.slice(0, 20).join("\n     ")}`);

console.log(`\nPesan server dinamis (diterjemahkan lewat parameter): ${dynamic.length === 0 ? "tidak ada" : dynamic.length}`);
if (dynamic.length) console.log("     " + dynamic.slice(0, 5).join("\n     "));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} lulus, ${bad} gagal`);
process.exit(bad ? 1 : 0);
