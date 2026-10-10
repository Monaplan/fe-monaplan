// Template email bertipe, dua bahasa. Murni (tanpa I/O): dipakai pengirim, notifikasi dalam aplikasi, dan halaman pratinjau admin.

export type Lang = "id" | "en";

export type EmailData =
  | { kind: "agenda_reminder"; name: string; title: string; startsAt: string; location?: string | null; offsetMinutes: number; url: string }
  | { kind: "task_due"; name: string; title: string; dueIn: 0 | 3; url: string }
  | { kind: "payment_due"; name: string; payee: string; amount: string; dueIn: 1 | 7; url: string }
  | { kind: "rsvp_digest"; name: string; couple: string; responses: number; attending: number; pax: number; url: string }
  | { kind: "trial_ending"; name: string; daysLeft: number; url: string }
  | { kind: "trial_ended"; name: string; url: string }
  | { kind: "receipt"; name: string; orderNumber: string; plan: string; amount: string; method: string; validity: string; discount?: string | null; url: string }
  | { kind: "invitation"; name: string; inviter: string; project: string; role: "editor" | "viewer"; expiresDays: number; url: string }

export type EmailKind = EmailData["kind"];
export const EMAIL_KINDS: EmailKind[] = ["agenda_reminder", "task_due", "payment_due", "rsvp_digest", "trial_ending", "trial_ended", "receipt", "invitation"];

// Isi tiap email: judul/subjek, paragraf, baris rincian, dan tombol
type Content = { subject: string; headline: string; paragraphs: string[]; rows?: [string, string][]; cta: string; preheader: string };

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

function when(lang: Lang, min: number) {
  if (min <= 0) return lang === "id" ? "Dimulai sekarang" : "Starting now";
  if (min >= 10080) { const w = Math.round(min / 10080); return lang === "id" ? `${w} minggu lagi` : `In ${w} week${w > 1 ? "s" : ""}`; }
  if (min >= 1440) { const d = Math.round(min / 1440); return lang === "id" ? `${d} hari lagi` : `In ${d} day${d > 1 ? "s" : ""}`; }
  if (min >= 60) { const h = Math.round(min / 60); return lang === "id" ? `${h} jam lagi` : `In ${h} hour${h > 1 ? "s" : ""}`; }
  return lang === "id" ? `${min} menit lagi` : `In ${min} minutes`;
}

const days = (lang: Lang, n: number) => (lang === "id" ? `${n} hari` : `${n} day${n === 1 ? "" : "s"}`);

function content(lang: Lang, d: EmailData): Content {
  const id = lang === "id";
  switch (d.kind) {
    case "agenda_reminder": {
      const w = when(lang, d.offsetMinutes);
      return {
        subject: id ? `Pengingat: ${d.title}` : `Reminder: ${d.title}`,
        headline: id ? `Pengingat: ${d.title}` : `Reminder: ${d.title}`,
        paragraphs: [`${w}. ${d.startsAt}${d.location ? ` · ${d.location}` : ""}`],
        cta: id ? "Buka kalender" : "Open calendar",
        preheader: `${w} · ${d.startsAt}`,
      };
    }
    case "task_due": {
      const t = d.dueIn === 0 ? (id ? "hari ini" : "today") : id ? "3 hari lagi" : "in 3 days";
      return {
        subject: id ? `Tugas jatuh tempo ${t}: ${d.title}` : `Task due ${t}: ${d.title}`,
        headline: id ? `Tugas jatuh tempo ${t}` : `Task due ${t}`,
        paragraphs: [d.title],
        cta: id ? "Buka checklist" : "Open checklist",
        preheader: d.title,
      };
    }
    case "payment_due": {
      const t = d.dueIn === 1 ? (id ? "besok" : "tomorrow") : id ? "7 hari lagi" : "in 7 days";
      return {
        subject: id ? `Pembayaran ${d.payee} jatuh tempo ${t}` : `Payment to ${d.payee} due ${t}`,
        headline: id ? `Pembayaran jatuh tempo ${t}` : `Payment due ${t}`,
        paragraphs: [],
        rows: [[id ? "Vendor" : "Vendor", d.payee], [id ? "Nominal" : "Amount", d.amount]],
        cta: id ? "Buka budget" : "Open budget",
        preheader: `${d.payee} · ${d.amount}`,
      };
    }
    case "rsvp_digest":
      return {
        subject: id ? `${d.responses} RSVP baru: ${d.couple}` : `${d.responses} new RSVPs: ${d.couple}`,
        headline: id ? `${d.responses} RSVP baru hari ini` : `${d.responses} new RSVPs today`,
        paragraphs: [],
        rows: [[id ? "Hadir" : "Attending", `${d.attending} (${d.pax} pax)`], [id ? "Respon baru" : "New responses", String(d.responses)]],
        cta: id ? "Lihat daftar tamu" : "View guest list",
        preheader: id ? `${d.attending} hadir (${d.pax} pax)` : `${d.attending} attending (${d.pax} pax)`,
      };
    case "trial_ending":
      return {
        subject: id ? `Trial Monaplan berakhir ${days(lang, d.daysLeft)} lagi` : `Your Monaplan trial ends in ${days(lang, d.daysLeft)}`,
        headline: id ? `Trial berakhir ${days(lang, d.daysLeft)} lagi` : `Trial ends in ${days(lang, d.daysLeft)}`,
        paragraphs: [id ? "Aktifkan akses selamanya agar kamu tetap bisa mengedit. Datamu aman apa pun pilihanmu." : "Activate lifetime access to keep editing. Your data stays safe either way."],
        cta: id ? "Aktifkan akses" : "Activate access",
        preheader: id ? "Datamu tetap aman." : "Your data stays safe.",
      };
    case "trial_ended":
      return {
        subject: id ? "Trial Monaplan telah berakhir" : "Your Monaplan trial has ended",
        headline: id ? "Trial telah berakhir" : "Trial has ended",
        paragraphs: [id ? "Ruang kerjamu kini hanya bisa dilihat dan diekspor. Aktifkan akses selamanya untuk kembali mengedit." : "Your workspace is now read-only and can still be exported. Activate lifetime access to edit again."],
        cta: id ? "Aktifkan akses" : "Activate access",
        preheader: id ? "Data tetap aman." : "Your data is safe.",
      };
    case "receipt":
      return {
        subject: id ? `Kuitansi ${d.orderNumber}` : `Receipt ${d.orderNumber}`,
        headline: id ? "Pembayaran berhasil" : "Payment received",
        paragraphs: [id ? "Terima kasih. Berikut kuitansimu." : "Thank you. Here is your receipt."],
        rows: [
          [id ? "Nomor order" : "Order number", d.orderNumber],
          [id ? "Paket" : "Plan", d.plan],
          ...(d.discount ? ([[id ? "Promo" : "Promo", d.discount]] as [string, string][]) : []),
          [id ? "Total" : "Total", d.amount],
          [id ? "Metode bayar" : "Payment method", d.method],
          [id ? "Masa aktif" : "Validity", d.validity],
        ],
        cta: id ? "Lihat tagihan" : "View billing",
        preheader: `${d.plan} · ${d.amount}`,
      };
    case "invitation":
      return {
        subject: id ? `${d.inviter} mengundangmu ke ${d.project}` : `${d.inviter} invited you to ${d.project}`,
        headline: id ? `Diundang ke ${d.project}` : `You're invited to ${d.project}`,
        paragraphs: [
          id ? `${d.inviter} mengajakmu ikut merencanakan pernikahan di Monaplan sebagai ${d.role === "editor" ? "Editor" : "Viewer"}.` : `${d.inviter} invited you to plan a wedding together on Monaplan as ${d.role === "editor" ? "Editor" : "Viewer"}.`,
          id ? `Masuk dengan email ini. Undangan berlaku ${d.expiresDays} hari.` : `Sign in with this email address. The invitation is valid for ${d.expiresDays} days.`,
        ],
        cta: id ? "Terima undangan" : "Accept invitation",
        preheader: id ? `Sebagai ${d.role === "editor" ? "Editor" : "Viewer"}` : `As ${d.role === "editor" ? "Editor" : "Viewer"}`,
      };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Rendered = { subject: string; html: string; text: string; title: string; body: string };

export function renderEmail(lang: Lang, data: EmailData, opts: { appUrl: string; unsubscribe?: boolean } = { appUrl: "" }): Rendered {
  const c = content(lang, data);
  const id = lang === "id";
  const hello = id ? `Halo ${first(data.name)},` : `Hi ${first(data.name)},`;
  const footer = id
    ? "Kamu menerima email ini karena notifikasi email aktif di akunmu. Matikan lewat Akun > Profil."
    : "You receive this email because email notifications are on for your account. Turn them off in Account > Profile.";
  const showFooter = opts.unsubscribe !== false && data.kind !== "receipt" && data.kind !== "invitation";

  const rows = c.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;border-collapse:collapse">${c.rows
        .map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #EFE9EC;color:#6B5F66;font-size:13px">${esc(k)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #EFE9EC;font-size:14px;font-weight:600;color:#1C1619">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  const paras = c.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#43393E">${esc(p)}</p>`).join("");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#FBF5F8;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#1C1619">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF5F8"><tr><td align="center" style="padding:28px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td style="padding:0 4px 14px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#8C3A63">Monaplan</td></tr>
    <tr><td style="background:#ffffff;border:1px solid #E8E2E5;border-radius:18px;padding:28px 26px">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:28px;color:#1C1619">${esc(c.headline)}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#43393E">${esc(hello)}</p>
      ${paras}${rows}
      <p style="margin:22px 0 0"><a href="${esc(data.url)}" style="display:inline-block;background:#8C3A63;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(c.cta)}</a></p>
    </td></tr>
    ${showFooter ? `<tr><td style="padding:16px 8px 0;font-size:12px;line-height:18px;color:#7A6E75">${esc(footer)}</td></tr>` : ""}
    <tr><td style="padding:10px 8px 0;font-size:12px;color:#9A8E95">Monaplan · ${esc(opts.appUrl.replace(/^https?:\/\//, ""))}</td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = [hello, "", c.headline, ...c.paragraphs, ...(c.rows ?? []).map(([k, v]) => `${k}: ${v}`), "", `${c.cta}: ${data.url}`, ...(showFooter ? ["", footer] : [])].join("\n");
  const body = [...c.paragraphs, ...(c.rows ?? []).map(([k, v]) => `${k}: ${v}`)].join(" · ");
  return { subject: c.subject, html, text, title: c.headline, body };
}

// Data contoh untuk halaman pratinjau admin
export function sampleData(kind: EmailKind, url = "https://monaplan.example/app/raka-nadia"): EmailData {
  const name = "Raka Pratama";
  switch (kind) {
    case "agenda_reminder": return { kind, name, title: "Fitting busana akad", startsAt: "Sabtu, 1 Mei 2027 pukul 10.00", location: "Butik Anggun, Malang", offsetMinutes: 1440, url };
    case "task_due": return { kind, name, title: "Booking fotografer dan videografer", dueIn: 3, url };
    case "payment_due": return { kind, name, payee: "Katering Sari Rasa", amount: "Rp 15.000.000", dueIn: 7, url };
    case "rsvp_digest": return { kind, name, couple: "Raka & Nadia", responses: 6, attending: 5, pax: 11, url };
    case "trial_ending": return { kind, name, daysLeft: 1, url };
    case "trial_ended": return { kind, name, url };
    case "receipt": return { kind, name, orderNumber: "MNP-20261009-ABC123", plan: "Monaplan Selamanya", amount: "Rp 159.200", method: "QRIS", validity: "Selamanya", discount: "Promo Akhir Tahun (-Rp 39.800)", url };
    case "invitation": return { kind, name: "Nadia Putri", inviter: "Raka Pratama", project: "Raka & Nadia", role: "editor", expiresDays: 7, url };
  }
}

export const EMAIL_LABEL: Record<EmailKind, { id: string; en: string }> = {
  agenda_reminder: { id: "Pengingat agenda", en: "Agenda reminder" },
  task_due: { id: "Tugas jatuh tempo", en: "Task due" },
  payment_due: { id: "Pembayaran jatuh tempo", en: "Payment due" },
  rsvp_digest: { id: "Ringkasan RSVP", en: "RSVP digest" },
  trial_ending: { id: "Trial akan berakhir", en: "Trial ending" },
  trial_ended: { id: "Trial berakhir", en: "Trial ended" },
  receipt: { id: "Kuitansi pembayaran", en: "Payment receipt" },
  invitation: { id: "Undangan kolaborator", en: "Collaborator invitation" },
};
