import type { ReactNode } from "react";

// Template dibuat ulang di setiap navigasi, sehingga isi halaman muncul dengan transisi singkat
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
