import { requireAdmin } from "@/lib/access";
import { appUrl } from "@/lib/constants";
import { EMAIL_KINDS, renderEmail, sampleData, type EmailKind, type Lang } from "@/lib/email/templates";
import { EmailPreview, type PreviewMap } from "./email-preview";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Email") };
}

export default async function EmailPage() {
  await requireAdmin();
  const base = appUrl();
  const previews = {} as PreviewMap;
  for (const kind of EMAIL_KINDS as EmailKind[]) {
    previews[kind] = {} as PreviewMap[EmailKind];
    for (const lang of ["id", "en"] as Lang[]) {
      const r = renderEmail(lang, sampleData(kind, `${base}/app/raka-nadia`), { appUrl: base });
      previews[kind][lang] = { subject: r.subject, html: r.html, text: r.text };
    }
  }
  return <EmailPreview previews={previews} from={process.env.EMAIL_FROM ?? "Monaplan <onboarding@resend.dev>"} configured={!!process.env.RESEND_API_KEY} />;
}
