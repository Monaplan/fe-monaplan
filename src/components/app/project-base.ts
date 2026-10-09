"use client";

import { usePathname } from "next/navigation";

// Alamat dasar ruang kerja yang sedang dibuka (mis. /app/raka-nadia), diambil dari URL.
// Dipakai komponen klien untuk membuat tautan tanpa harus menerima slug lewat props.
export function useProjectBase() {
  const pathname = usePathname() ?? "";
  const [, root, ref] = pathname.split("/");
  return root === "app" && ref ? `/app/${ref}` : "/mulai";
}
