// Kamus Inggris: kunci = teks sumber (Indonesia), nilai = terjemahan.
// Dibagi beberapa berkas agar mudah dikelola. Kelengkapannya diuji oleh scripts/test-i18n.mjs.
import { EN1 } from "./en/part1";
import { EN2 } from "./en/part2";
import { EN3 } from "./en/part3";
import { EN4 } from "./en/part4";
import { EN5 } from "./en/part5";

export const EN: Record<string, string> = { ...EN1, ...EN2, ...EN3, ...EN4, ...EN5 };
