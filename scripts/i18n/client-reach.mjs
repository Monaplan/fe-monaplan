// Menemukan berkas yang terjangkau dari komponen "use client" tetapi mengimpor @/i18n/server (tidak boleh).
// Pakai: node scripts/i18n/client-reach.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(e.name) && files.push(p); } })(path.join(ROOT, "src"));

const text = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));
const isServerActions = (t) => /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(t);
const isClient = (t) => /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(t);
const resolve = (from, spec) => {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base + ".tsx", base + ".ts", path.join(base, "index.tsx"), path.join(base, "index.ts"), base]) if (text.has(c)) return c;
  return null;
};
const imports = (f) => [...text.get(f).matchAll(/^import\s(?!type\s)[^;]*?from\s+["']([^"']+)["']|^import\s+["']([^"']+)["']/gm)].map((m) => resolve(f, m[1] ?? m[2])).filter(Boolean);

const reach = new Set();
const queue = files.filter((f) => isClient(text.get(f)));
for (const f of queue) reach.add(f);
while (queue.length) {
  const f = queue.pop();
  if (isServerActions(text.get(f))) continue; // dikompilasi menjadi stub RPC: impor di dalamnya tidak ikut ke klien
  for (const g of imports(f)) if (!reach.has(g)) { reach.add(g); queue.push(g); }
}
const bad = [...reach].filter((f) => /@\/i18n\/server|from "server-only"|import "server-only"/.test(text.get(f)) && !isClient(text.get(f)) || (isClient(text.get(f)) && /@\/i18n\/server/.test(text.get(f))));
for (const f of bad) console.log(path.relative(ROOT, f).replace(/\\/g, "/"));
console.log(bad.length ? `\n${bad.length} berkas bermasalah` : "tidak ada");
process.exit(bad.length ? 1 : 0);
