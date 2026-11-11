import { requireAdmin } from "@/lib/access";
import { getContact, getSettings } from "@/lib/settings";
import { ProfileClient } from "./profile-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Profil Monaplan") };
}

export default async function ProfilePage() {
  await requireAdmin();
  const [{ profile }, effective] = await Promise.all([getSettings(), getContact()]);
  // Bagian yang kosong di profil tetapi terisi dari env (cadangan): ditandai agar admin tahu dari mana nilainya
  const fromEnv = { whatsapp: !profile.whatsapp && !!effective.whatsapp, email: !profile.email && !!effective.email };
  return <ProfileClient saved={profile} effective={effective} fromEnv={fromEnv} />;
}
