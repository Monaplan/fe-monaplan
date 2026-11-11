import { requireAdmin } from "@/lib/access";
import { getContact } from "@/lib/settings";
import { getAllBio } from "@/lib/bio-data";
import { bioPageUrl } from "@/lib/constants";
import { getT } from "@/i18n/server";
import { BioClient } from "./bio-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Bio Link") };
}

export default async function BioAdminPage() {
  await requireAdmin();
  const [contact, bio] = await Promise.all([getContact(), getAllBio()]);
  return <BioClient links={bio.links} sections={bio.sections} contact={contact} views={bio.views} bioUrl={bioPageUrl()} missing={bio.missing} sectionsMissing={bio.sectionsMissing} />;
}
