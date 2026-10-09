// Membungkus teks pengguna dengan t(...) di seluruh src, menyuntik hook, dan menulis daftar kunci.
// Pakai: node scripts/i18n/codemod.mjs [--dry] [--out <file.json>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, applyEdits } from "./analyze.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dry = process.argv.includes("--dry");
const outIdx = process.argv.indexOf("--out");
const outFile = outIdx > 0 ? process.argv[outIdx + 1] : null;

// Dilewati: bahasa Indonesia sengaja dipertahankan atau ditangani manual
const SKIP = [
  /^src\/i18n\//, /^src\/lib\/email/, /^src\/content\//, /^src\/lib\/format\.ts$/, /^src\/lib\/constants\.ts$/, /^src\/lib\/seo\.ts$/,
  /^src\/app\/privasi\//, /^src\/app\/rsvp\//, /^src\/app\/api\//, /opengraph-image|apple-icon|\/icon\.tsx$|manifest|sitemap|robots/, /^src\/lib\/pdf\//,
];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p);
  }
})(path.join(ROOT, "src"));

const allKeys = new Map(); // kunci -> berkas pertama
const report = { orphans: [], orphanKeys: new Set(), mixed: [], changed: 0, notAsync: 0 };
for (const abs of files) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  if (SKIP.some((r) => r.test(rel))) continue;
  const text = fs.readFileSync(abs, "utf8");
  const res = analyze(rel, text);
  for (const k of res.keys) if (!allKeys.has(k)) allKeys.set(k, rel);
  for (const o of res.orphans) { report.orphans.push(`${rel}:${o.at} ${o.text.slice(0, 70)}`); report.orphanKeys.add(o.text); }
  for (const m of res.mixed) report.mixed.push(`${rel}:${m.at} ${m.text}`);
  if (!res.edits.length) continue;
  const r = applyEdits(rel, text, res);
  report.notAsync += r.notAsync;
  report.changed++;
  if (!dry) fs.writeFileSync(abs, r.text);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ keys: [...allKeys.keys()], orphanKeys: [...report.orphanKeys], orphans: report.orphans, mixed: report.mixed }, null, 2));
console.log(`${dry ? "[dry] " : ""}berkas diubah: ${report.changed} | kunci: ${allKeys.size} | yatim (di luar komponen): ${report.orphans.length} | campuran: ${report.mixed.length} | dijadikan async: ${report.notAsync}`);
