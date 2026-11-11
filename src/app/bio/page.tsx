import { headers } from "next/headers";
import { after } from "next/server";
import { BioView } from "@/components/bio/bio-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContact } from "@/lib/settings";
import { getPublicBio } from "@/lib/bio-data";
import { isBot } from "@/lib/links";
import { SITE } from "@/lib/seo";
import { bioPageUrl } from "@/lib/constants";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  const description = t("Persiapan pernikahan, rapi dalam satu tempat.");
  return { title: SITE.name, description, alternates: { canonical: bioPageUrl() }, openGraph: { title: SITE.name, description, type: "website" as const, url: bioPageUrl() } };
}

// Halaman bio link publik: satu desain tetap berisi tombol dan section tautan. Tombol menuju /b/<id> supaya kliknya terhitung.
export default async function BioPage() {
  const [nodes, contact, h, t] = await Promise.all([getPublicBio(), getContact(), headers(), getT()]);
  // Kunjungan dihitung setelah halaman terkirim, sehingga tidak memperlambat; bot dan pratinjau tautan tidak dihitung
  if (!isBot(h.get("user-agent"))) after(async () => { try { await createAdminClient().rpc("bump_stat", { p_key: "bio:views" }); } catch {} });
  return <BioView nodes={nodes} contact={contact} hrefFor={(l) => `/b/${l.id}`} labels={{ tagline: t("Persiapan pernikahan, rapi dalam satu tempat."), footer: t("Dibuat dengan Monaplan"), emptyHint: "", featured: t("Unggulan") }} />;
}
