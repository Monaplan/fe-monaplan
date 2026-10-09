import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDownloadUrl } from "@/lib/storage";

// Pratinjau dan unduh lewat signed URL berumur pendek (DOC-04)
export async function GET(request: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: doc } = await supabase.from("documents").select("storage_path, file_name").eq("id", docId).maybeSingle();
  if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // Dokumen terbaca lewat RLS berarti user anggota proyek; baru setelah itu URL bertanda tangan dibuat
  const download = new URL(request.url).searchParams.has("unduh");
  const url = await getDownloadUrl(doc.storage_path, { expiresIn: 60, downloadName: download ? doc.file_name : undefined });
  if (!url) return NextResponse.json({ error: "SIGN_FAILED" }, { status: 500 });
  return NextResponse.redirect(url);
}
