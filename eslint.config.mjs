// Konfigurasi ESLint (flat config). Jalankan: npm run lint
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Klien Supabase di proyek ini tidak bertipe, jadi `any` dipakai luas untuk baris hasil query
      "@typescript-eslint/no-explicit-any": "off",
      // Awalan _ menandai sengaja tidak dipakai
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // Destructuring campuran (satu dipakai ulang, satu tidak) tidak perlu dipecah
      "prefer-const": ["error", { destructuring: "all" }],
      // Aturan React Compiler yang bersifat saran: tampil sebagai peringatan, tidak menggagalkan lint.
      // purity dimatikan karena Date.now() di server component (halaman) memang wajar.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      // Muat ulang penuh setelah masuk/keluar disengaja, supaya sesi baru terbaca server
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts", "public/sw.js", "workers/**", "supabase/**", "scripts/**", "brand/**", "docs/**"]),
]);
