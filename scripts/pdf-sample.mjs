// Membuat contoh PDF rundown ke folder keluaran, untuk diperiksa secara visual. Pakai: node scripts/pdf-sample.mjs <folder> [jumlah-butir]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? os.tmpdir());
const n = Number(process.argv[3] ?? 14);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mp-pdf-"));
// node_modules harus terlihat dari folder sementara
fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(TMP, "node_modules"), "junction");

for (const rel of ["src/lib/pdf/rundown.tsx", "src/lib/format.ts"]) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8").replace('import "server-only";', "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from "@\/lib\/format"/g, 'from "../format.mjs"');
  const dest = path.join(TMP, rel.replace("src/lib/", "").replace(/\.tsx?$/, ".mjs"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, js);
}
fs.renameSync(path.join(TMP, "format.mjs"), path.join(TMP, "format.mjs"));
const { renderRundownPdf } = await import(pathToFileURL(path.join(TMP, "pdf/rundown.mjs")).href);

const titles = ["Tamu mulai berdatangan dan registrasi", "Pembukaan oleh MC", "Pembacaan ayat suci Al-Qur'an", "Sambutan keluarga mempelai pria", "Sambutan keluarga mempelai wanita", "Prosesi akad nikah", "Doa dan penyerahan mahar", "Foto bersama keluarga inti", "Makan siang tamu undangan", "Hiburan musik akustik", "Sesi foto bersama tamu", "Pemotongan kue", "Penutupan dan doa", "Tamu pulang dan pembongkaran dekorasi"];
const mk = (count) => Array.from({ length: count }, (_, i) => {
  const start = 8 * 60 + i * 20, end = start + (i % 3 === 0 ? 45 : 20);
  const f = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
  return { start_time: f(start), end_time: i % 5 === 4 ? null : f(end), title: titles[i % titles.length] + (i >= titles.length ? ` (${i + 1})` : ""),
    description: i % 2 ? "Seluruh keluarga inti sudah berada di lokasi 15 menit sebelum acara dimulai." : null,
    pic_name: ["Bu Rina", "Pak Hendra", "MC Dimas", "WO Lestari"][i % 4], location: i % 3 ? "Ballroom Utama" : null, vendor: i % 4 === 0 ? "Katering Sari Rasa" : null };
});
const sec = (name, count) => ({ eventName: name, startsAt: "2027-05-01T01:00:00Z", venue: "Gedung Serbaguna Graha Wicaksana, Malang", items: mk(count) });

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "rundown-pendek.pdf"), await renderRundownPdf({ couple: "Raka & Nadia", tz: "Asia/Jakarta", sections: [sec("Akad Nikah", 6)] }));
fs.writeFileSync(path.join(out, "rundown-panjang.pdf"), await renderRundownPdf({ couple: "Raka & Nadia", tz: "Asia/Jakarta", sections: [sec("Resepsi", n), { ...sec("Ngunduh Mantu", 0) }] }));
fs.rmSync(TMP, { recursive: true, force: true });
console.log("PDF dibuat di", out);
