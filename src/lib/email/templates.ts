// Template email bertipe, dua bahasa. Murni (tanpa I/O): dipakai pengirim, notifikasi dalam aplikasi, dan halaman pratinjau admin.
// Gaya mengikuti situs: palet plum, kartu putih membulat, Cormorant Garamond untuk judul, Plus Jakarta Sans untuk teks.

export type Lang = "id" | "en";

type Tone = "danger" | "caution" | "plum" | "neutral";

export type DigestAgenda = { time: string; end?: string | null; title: string; where?: string | null; note?: string | null; soon?: string | null };
export type DigestTask = { title: string; meta: string; due: string; tone: Tone };
export type DigestPayment = { vendor: string; meta: string; amount: string; due: string; tone: Tone };

export type EmailData =
  // Email terjadwal dan transaksional
  | { kind: "daily_digest"; name: string; couple: string; dateLabel: string; daysToGo: number | null; agenda: DigestAgenda[]; tasks: DigestTask[]; payments: DigestPayment[]; paymentTotal: string | null; url: string }
  | { kind: "rsvp_digest"; name: string; couple: string; responses: number; attending: number; notAttending: number; pax: number; recent: { name: string; status: string; attending: boolean; message?: string | null }[]; answered: number; totalGuests: number; url: string }
  | { kind: "trial_ended"; name: string; couple?: string | null; plan: string; price: string; original?: string | null; promo?: { name: string; code: string | null; saving: string; until: string | null } | null; url: string }
  | { kind: "receipt"; name: string; orderNumber: string; plan: string; amount: string; method: string; validity: string; discount?: string | null; original?: string | null; paidAt?: string | null; url: string }
  | { kind: "invitation"; name: string; inviter: string; project: string; role: "editor" | "viewer"; expiresDays: number; weddingDate?: string | null; url: string }
  // Hanya untuk notifikasi dalam aplikasi (email untuk ini digabung ke ringkasan harian)
  | { kind: "agenda_reminder"; name: string; title: string; startsAt: string; location?: string | null; offsetMinutes: number; url: string }
  | { kind: "task_due"; name: string; title: string; dueIn: 0 | 3; url: string }
  | { kind: "payment_due"; name: string; payee: string; amount: string; dueIn: 1 | 7; url: string };

export type EmailKind = EmailData["kind"];
// Jenis yang benar-benar dikirim lewat email (dipakai halaman pratinjau admin)
export const EMAIL_KINDS = ["daily_digest", "rsvp_digest", "trial_ended", "receipt", "invitation"] as const satisfies readonly EmailKind[];
export type SentEmailKind = (typeof EMAIL_KINDS)[number];

const C = {
  p50: "#FBF5F8", p100: "#F6E8EF", p200: "#EDD1DF", p600: "#8C3A63", p700: "#722E51", p900: "#3E1A2D", p950: "#26101C",
  n100: "#F3EFF1", n200: "#E8E2E5", n500: "#73676D", n600: "#5E5358", n700: "#43393E", n900: "#1C1619",
  danger: "#B42F4E", dangerBg: "#FBEAEE", caution: "#9A4A2E", cautionBg: "#FBEEE8", gold: "#F3C969",
};
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
const TONE: Record<Tone, [string, string]> = { danger: [C.dangerBg, C.danger], caution: [C.cautionBg, C.caution], plum: [C.p100, C.p700], neutral: [C.n100, C.n600] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

// ---------- Potongan HTML ----------
const pill = (t: string, tone: Tone = "neutral") => `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${TONE[tone][0]};color:${TONE[tone][1]};font-size:12px;font-weight:600;white-space:nowrap">${esc(t)}</span>`;
const para = (html: string) => `<p style="margin:0 0 10px;font-size:15px;line-height:24px;color:${C.n700}">${html}</p>`;
const divider = `<div style="height:1px;line-height:1px;background:${C.n200}">&nbsp;</div>`;
const joinRows = (rows: string[]) => rows.join(divider);
const title = (t: string) => `<div style="font-size:15px;font-weight:600;line-height:22px;color:${C.n900}">${esc(t)}</div>`;
const meta = (html: string) => `<div style="margin-top:3px;font-size:13px;line-height:19px;color:${C.n600}">${html}</div>`;
const line = (left: string, right: string, valign = "top") => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td valign="${valign}" style="padding:14px 0">${left}</td>
    <td align="right" valign="${valign}" style="padding:14px 0 14px 14px">${right}</td>
  </tr></table>`;
const kv = (rows: [string, string, boolean?][]) => joinRows(rows.map(([k, v, accent]) => line(
  `<span style="font-size:14px;color:${C.n600}">${esc(k)}</span>`,
  `<span style="font-size:15px;font-weight:700;color:${accent ? C.p600 : C.n900}">${esc(v)}</span>`, "middle")));
const total = (label: string, value: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;background:${C.p50};border-radius:14px"><tr>
    <td style="padding:14px 16px;font-size:14px;font-weight:600;color:${C.n700}">${esc(label)}</td>
    <td align="right" style="padding:14px 16px;font-size:18px;font-weight:700;color:${C.p600};white-space:nowrap">${esc(value)}</td>
  </tr></table>`;
const card = (heading: string, count: number | null, body: string) => `
  <tr><td style="padding:14px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.n200};border-radius:20px"><tr><td style="padding:20px 22px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:16px;font-weight:700;color:${C.n900}">${esc(heading)}</td>
        ${count != null ? `<td align="right">${pill(String(count), "plum")}</td>` : ""}
      </tr></table>
      <div style="height:6px;line-height:6px">&nbsp;</div>
      ${body}
    </td></tr></table>
  </td></tr>`;
const coupleLine = (couple: string) => `<span style="font-family:${SERIF};font-size:20px;font-style:italic;color:#ffffff">${esc(couple)}</span>`;

type Shell = { subject: string; preheader: string; kicker: string; heading: string; sub?: string; stats?: [number, string][]; intro: string; body?: string; cta: string; ctaUrl: string; links?: [string, string][] };

function shell(lang: Lang, s: Shell, appUrl: string) {
  const statCell = ([n, l]: [number, string]) => `<td align="center" style="padding:10px 4px;background:rgba(255,255,255,0.10);border-radius:14px"><div style="font-family:${SERIF};font-size:26px;line-height:28px;color:#ffffff">${n}</div><div style="margin-top:2px;font-size:12px;color:${C.p200}">${esc(l)}</div></td>`;
  const logo = appUrl ? `<td><img src="${esc(appUrl)}/apple-icon" width="36" height="36" alt="" style="display:block;border-radius:10px"></td>` : "";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(s.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;background:${C.p50};font-family:${SANS};color:${C.n900}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(s.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.p50}"><tr><td align="center" style="padding:28px 14px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:0 4px 18px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>${logo}
      <td style="padding-left:${appUrl ? 10 : 0}px;font-family:${SERIF};font-size:26px;font-weight:600;color:${C.n900}">Monaplan</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${C.p900};background-image:radial-gradient(420px 260px at 0% 0%,rgba(198,124,159,0.45),transparent 60%),linear-gradient(160deg,${C.p900} 0%,${C.p950} 100%);border-radius:24px;padding:26px 24px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.p200}">${esc(s.kicker)}</div>
    <div style="margin-top:8px;font-family:${SERIF};font-size:32px;line-height:38px;font-weight:500;color:#ffffff">${s.heading}</div>
    ${s.sub ? `<div style="margin-top:8px;font-size:14px;line-height:22px;color:#F3DCE7">${s.sub}</div>` : ""}
    ${s.stats ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:14px"><tr>${s.stats.map(statCell).join("")}</tr></table>` : ""}
  </td></tr>
  <tr><td style="padding:22px 6px 4px">${s.intro}</td></tr>
  ${s.body ?? ""}
  <tr><td align="center" style="padding:26px 0 0">
    <a href="${esc(s.ctaUrl)}" style="display:inline-block;background:${C.p600};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:999px;font-size:15px;font-weight:600">${esc(s.cta)} &rarr;</a>
  </td></tr>
  ${s.links?.length ? `<tr><td align="center" style="padding:16px 0 0;font-size:13px">${s.links.map(([t, u]) => `<a href="${esc(u)}" style="color:${C.p600};font-weight:600;text-decoration:none">${esc(t)}</a>`).join(`<span style="color:${C.n500}">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)}</td></tr>` : ""}
  <tr><td align="center" style="padding:26px 10px 0;font-size:12px;line-height:19px;color:${C.n500}"><span style="font-family:${SERIF};font-size:15px;font-weight:600;color:${C.n700}">Monaplan</span> · ${lang === "id" ? "satu tempat untuk semua rencana nikahmu" : "one place for all your wedding plans"}</td></tr>
</table>
</td></tr></table></body></html>`;
}

function when(lang: Lang, min: number) {
  if (min <= 0) return lang === "id" ? "Dimulai sekarang" : "Starting now";
  if (min >= 10080) { const w = Math.round(min / 10080); return lang === "id" ? `${w} minggu lagi` : `In ${w} week${w > 1 ? "s" : ""}`; }
  if (min >= 1440) { const d = Math.round(min / 1440); return lang === "id" ? `${d} hari lagi` : `In ${d} day${d > 1 ? "s" : ""}`; }
  if (min >= 60) { const h = Math.round(min / 60); return lang === "id" ? `${h} jam lagi` : `In ${h} hour${h > 1 ? "s" : ""}`; }
  return lang === "id" ? `${min} menit lagi` : `In ${min} minutes`;
}

// Isi per jenis: kerangka HTML, versi teks, serta judul dan isi singkat untuk notifikasi dalam aplikasi
type Built = { shell: Shell; text: string[]; title: string; body: string };

function build(lang: Lang, d: EmailData): Built {
  const id = lang === "id";
  const L = (a: string, b: string) => (id ? a : b);
  const hi = L(`Halo ${first(d.name)},`, `Hi ${first(d.name)},`);
  switch (d.kind) {
    case "daily_digest": {
      const counts = L(`${d.agenda.length} agenda, ${d.tasks.length} tugas, dan ${d.payments.length} pembayaran`, `${d.agenda.length} events, ${d.tasks.length} tasks, and ${d.payments.length} payments`);
      const agendaHtml = joinRows(d.agenda.map((a) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="78" valign="top" style="padding:14px 0"><div style="font-size:15px;font-weight:700;color:${C.p600};white-space:nowrap">${esc(a.time)}</div>${a.end ? `<div style="font-size:12px;color:${C.n600}">${L("s.d.", "to")} ${esc(a.end)}</div>` : ""}</td>
          <td valign="top" style="padding:14px 0">${title(a.title)}${a.where ? meta(esc(a.where)) : ""}${a.note ? meta(`<i>${esc(a.note)}</i>`) : ""}</td>
          <td align="right" valign="top" style="padding:14px 0 14px 10px">${a.soon ? pill(a.soon, "plum") : ""}</td>
        </tr></table>`));
      const body = (d.agenda.length ? card(L("Agenda", "Events"), d.agenda.length, agendaHtml) : "")
        + (d.tasks.length ? card(L("Tugas checklist", "Checklist tasks"), d.tasks.length, joinRows(d.tasks.map((t) => line(title(t.title) + meta(esc(t.meta)), pill(t.due, t.tone))))) : "")
        + (d.payments.length ? card(L("Pembayaran vendor", "Vendor payments"), d.payments.length,
          joinRows(d.payments.map((p) => line(title(p.vendor) + meta(esc(p.meta)) + `<div style="margin-top:6px">${pill(p.due, p.tone)}</div>`, `<span style="font-size:15px;font-weight:700;color:${C.n900};white-space:nowrap">${esc(p.amount)}</span>`)))
          + (d.paymentTotal ? total(L("Total yang perlu disiapkan", "Total to prepare"), d.paymentTotal) : "")) : "");
      const days = d.daysToGo != null && d.daysToGo >= 0 ? ` &nbsp;·&nbsp; <b style="color:${C.gold}">${d.daysToGo === 0 ? L("Hari ini!", "Today!") : L(`${d.daysToGo} hari lagi`, `${d.daysToGo} days to go`)}</b>` : "";
      return {
        shell: {
          subject: `${d.couple} · ${d.dateLabel}`, preheader: L(`${counts} untuk hari ini.`, `${counts} for today.`),
          kicker: L("Ringkasan hari ini", "Today's summary"), heading: esc(d.dateLabel), sub: coupleLine(d.couple) + days,
          stats: [[d.agenda.length, L("agenda", "events")], [d.tasks.length, L("tugas", "tasks")], [d.payments.length, L("pembayaran", "payments")]],
          intro: para(L(`Halo ${esc(first(d.name))}, berikut yang perlu kalian perhatikan hari ini.`, `Hi ${esc(first(d.name))}, here is what needs your attention today.`)), body,
          cta: L("Buka dashboard", "Open dashboard"), ctaUrl: d.url,
          links: [[L("Kalender", "Calendar"), `${d.url}/kalender`], [L("Checklist", "Checklist"), `${d.url}/checklist`], [L("Budget", "Budget"), `${d.url}/budget`]],
        },
        text: [hi, "", `${d.couple} · ${d.dateLabel}`, "",
          ...d.agenda.map((a) => `• ${a.time} ${a.title}${a.where ? ` (${a.where})` : ""}${a.soon ? ` [${a.soon}]` : ""}`),
          ...d.tasks.map((t) => `• ${t.title} [${t.due}]`),
          ...d.payments.map((p) => `• ${p.vendor} ${p.amount} [${p.due}]`)],
        title: L(`Ringkasan ${d.dateLabel}`, `Summary for ${d.dateLabel}`), body: counts,
      };
    }
    case "rsvp_digest": {
      const recent = joinRows(d.recent.map((r) => line(title(r.name) + (r.message ? meta(`<i>“${esc(r.message)}”</i>`) : ""), pill(r.status, r.attending ? "plum" : "neutral"))));
      return {
        shell: {
          subject: L(`${d.responses} konfirmasi kehadiran baru · ${d.couple}`, `${d.responses} new RSVPs · ${d.couple}`),
          preheader: L(`${d.attending} hadir dengan total ${d.pax} orang.`, `${d.attending} attending, ${d.pax} people in total.`),
          kicker: L("Ringkasan RSVP hari ini", "Today's RSVP summary"), heading: L(`${d.responses} konfirmasi baru`, `${d.responses} new RSVPs`), sub: coupleLine(d.couple),
          stats: [[d.attending, L("hadir", "attending")], [d.notAttending, L("tidak hadir", "declined")], [d.pax, L("orang", "people")]],
          intro: para(L(`Halo ${esc(first(d.name))}, berikut tamu yang mengonfirmasi kehadiran dalam 24 jam terakhir.`, `Hi ${esc(first(d.name))}, these guests replied in the last 24 hours.`)),
          body: d.recent.length ? card(L("Konfirmasi terbaru", "Latest replies"), d.responses, recent + total(L("Total sejauh ini", "So far"), L(`${d.answered} dari ${d.totalGuests} tamu`, `${d.answered} of ${d.totalGuests} guests`))) : "",
          cta: L("Lihat daftar tamu", "View guest list"), ctaUrl: d.url,
        },
        text: [hi, "", L(`${d.responses} konfirmasi baru: ${d.attending} hadir (${d.pax} orang).`, `${d.responses} new RSVPs: ${d.attending} attending (${d.pax} people).`), ...d.recent.map((r) => `• ${r.name}: ${r.status}`)],
        title: L(`${d.responses} RSVP baru hari ini`, `${d.responses} new RSVPs today`),
        body: L(`Hadir: ${d.attending} (${d.pax} orang)`, `Attending: ${d.attending} (${d.pax} people)`),
      };
    }
    case "trial_ended": {
      const priceRow = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="padding:12px 0">${title(d.plan)}${meta(L("Bonus Rona Impian dan Honeymoon Planner termasuk", "Includes Inspiration Board and Honeymoon Planner"))}</td>
          <td align="right" valign="top" style="padding:12px 0 12px 14px;white-space:nowrap">
            <div style="font-size:22px;font-weight:700;color:${C.p600}">${esc(d.price)}</div>
            ${d.original ? `<div style="font-size:13px;color:${C.n500};text-decoration:line-through">${esc(d.original)}</div>` : ""}
          </td>
        </tr></table>`;
      const promoBox = d.promo ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;background:${C.p50};border:1px dashed ${C.p600};border-radius:14px"><tr><td style="padding:14px 16px">
          <div>${pill(L("Promo aktif", "Active promo"), "plum")} &nbsp;<b style="font-size:14px;color:${C.n900}">${esc(d.promo.name)}</b></div>
          <div style="margin-top:8px;font-size:13px;line-height:20px;color:${C.n700}">${L("Hemat", "Save")} <b style="color:${C.p600}">${esc(d.promo.saving)}</b>.${d.promo.until ? ` ${L("Berlaku sampai", "Valid until")} <b style="color:${C.danger}">${esc(d.promo.until)}</b>.` : ""}</div>
          ${d.promo.code ? `<div style="margin-top:10px;font-size:12px;color:${C.n600}">${L("Kode promo", "Promo code")}</div><div style="margin-top:4px;display:inline-block;padding:7px 14px;border-radius:10px;background:#ffffff;border:1px solid ${C.n200};font-size:15px;font-weight:700;letter-spacing:1px;color:${C.p700}">${esc(d.promo.code)}</div>` : ""}
        </td></tr></table>` : "";
      const ws = d.couple ? L(`Ruang kerja ${esc(d.couple)}`, `Your ${esc(d.couple)} workspace`) : L("Ruang kerjamu", "Your workspace");
      return {
        shell: {
          subject: d.promo ? L(`Masa coba berakhir · lanjutkan dengan promo ${d.promo.name}`, `Your trial ended · continue with the ${d.promo.name} promo`) : L("Masa coba Monaplan telah berakhir", "Your Monaplan trial has ended"),
          preheader: d.promo ? L(`Akses selamanya ${d.price}${d.promo.until ? ` sampai ${d.promo.until}` : ""}.`, `Lifetime access for ${d.price}${d.promo.until ? ` until ${d.promo.until}` : ""}.`) : L("Ruang kerjamu tetap aman dan bisa dilihat.", "Your workspace is safe and still viewable."),
          kicker: L("Masa coba gratis", "Free trial"), heading: L("Telah berakhir", "Has ended"), sub: d.couple ? coupleLine(d.couple) : undefined,
          intro: para(L(`Halo ${esc(first(d.name))}, masa coba gratis Monaplan sudah berakhir. ${ws} kini hanya bisa dilihat dan diekspor.`, `Hi ${esc(first(d.name))}, your free Monaplan trial has ended. ${ws} is now view-only and can still be exported.`))
            + para(d.promo ? L("Kabar baik: sedang ada promo. Aktifkan akses selamanya sekarang dengan harga lebih hemat, semua data tetap utuh.", "Good news: a promo is running. Activate lifetime access now for less, with all your data intact.") : L("Aktifkan akses selamanya untuk kembali mengedit. Semua data yang sudah kamu isi tetap utuh.", "Activate lifetime access to edit again. Everything you have entered stays intact.")),
          body: card(L("Akses selamanya", "Lifetime access"), null, priceRow + divider + promoBox + total(L("Bayar sekali, tanpa langganan", "Pay once, no subscription"), d.price)),
          cta: d.promo ? L("Pakai promo", "Use promo") : L("Aktifkan akses", "Activate access"), ctaUrl: d.url,
        },
        text: [hi, "", L("Masa coba gratis Monaplan sudah berakhir.", "Your free Monaplan trial has ended."), `${d.plan}: ${d.price}${d.original ? ` (${L("dari", "was")} ${d.original})` : ""}`, ...(d.promo ? [`${d.promo.name}${d.promo.code ? ` · ${L("kode", "code")} ${d.promo.code}` : ""}`] : [])],
        title: L("Trial telah berakhir", "Trial has ended"),
        body: L("Ruang kerjamu kini hanya bisa dilihat. Aktifkan akses selamanya untuk kembali mengedit.", "Your workspace is now view-only. Activate lifetime access to edit again."),
      };
    }
    case "receipt": {
      const rows: [string, string, boolean?][] = [
        [L("Nomor order", "Order number"), d.orderNumber], [L("Paket", "Plan"), d.plan],
        ...(d.original ? [[L("Harga", "Price"), d.original] as [string, string]] : []),
        ...(d.discount ? [[L("Potongan", "Discount"), d.discount, true] as [string, string, boolean]] : []),
        [L("Metode bayar", "Payment method"), d.method], [L("Masa aktif", "Validity"), d.validity],
      ];
      return {
        shell: {
          subject: L(`Kuitansi ${d.orderNumber}`, `Receipt ${d.orderNumber}`), preheader: `${d.plan} · ${d.amount}`,
          kicker: L("Pembayaran berhasil", "Payment received"), heading: L(`Terima kasih, ${esc(first(d.name))}`, `Thank you, ${esc(first(d.name))}`), sub: d.paidAt ? esc(d.paidAt) : undefined,
          intro: para(L("Pembayaranmu sudah kami terima. Aksesmu kini aktif.", "We have received your payment. Your access is now active.")),
          body: card(L("Kuitansi", "Receipt"), null, kv(rows) + total(L("Total dibayar", "Total paid"), d.amount)),
          cta: L("Lihat kuitansi", "View receipt"), ctaUrl: d.url,
        },
        text: [hi, "", L("Pembayaran berhasil.", "Payment received."), ...rows.map(([k, v]) => `${k}: ${v}`), `${L("Total dibayar", "Total paid")}: ${d.amount}`],
        title: L("Pembayaran berhasil", "Payment received"), body: `${d.plan} · ${d.amount}`,
      };
    }
    case "invitation": {
      const role = d.role === "editor" ? "Editor" : "Viewer";
      return {
        shell: {
          subject: L(`${d.inviter} mengundangmu ke ${d.project}`, `${d.inviter} invited you to ${d.project}`),
          preheader: L(`Sebagai ${role} · berlaku ${d.expiresDays} hari`, `As ${role} · valid for ${d.expiresDays} days`),
          kicker: L("Undangan merencanakan bersama", "Invitation to plan together"), heading: `<i>${esc(d.project)}</i>`,
          sub: d.weddingDate ? L(`Menikah <b style="color:${C.gold}">${esc(d.weddingDate)}</b>`, `Getting married <b style="color:${C.gold}">${esc(d.weddingDate)}</b>`) : undefined,
          intro: para(L(`Halo ${esc(first(d.name))}, <b style="color:${C.n900}">${esc(d.inviter)}</b> mengajakmu ikut merencanakan pernikahan di Monaplan.`, `Hi ${esc(first(d.name))}, <b style="color:${C.n900}">${esc(d.inviter)}</b> invited you to plan a wedding together on Monaplan.`)),
          body: card(L("Rincian undangan", "Invitation details"), null, kv([
            [L("Peran", "Role"), role],
            [L("Akses", "Access"), d.role === "editor" ? L("Mengubah checklist, budget, tamu", "Edit checklist, budget, guests") : L("Melihat saja", "View only")],
            [L("Berlaku", "Valid for"), L(`${d.expiresDays} hari`, `${d.expiresDays} days`), true],
          ]) + `<div style="margin:6px 0 14px;padding:12px 14px;background:${C.p50};border-radius:14px;font-size:13px;line-height:20px;color:${C.n700}">${L("Masuk dengan alamat email ini agar undangan terhubung ke akunmu.", "Sign in with this email address so the invitation links to your account.")}</div>`),
          cta: L("Terima undangan", "Accept invitation"), ctaUrl: d.url,
        },
        text: [hi, "", L(`${d.inviter} mengundangmu ke ${d.project} sebagai ${role}.`, `${d.inviter} invited you to ${d.project} as ${role}.`)],
        title: L(`Diundang ke ${d.project}`, `Invited to ${d.project}`), body: L(`Sebagai ${role}`, `As ${role}`),
      };
    }
    // Hanya untuk notifikasi dalam aplikasi; kerangka email tetap disediakan agar renderEmail selalu berhasil
    case "agenda_reminder": {
      const w = when(lang, d.offsetMinutes);
      const body = `${w}. ${d.startsAt}${d.location ? ` · ${d.location}` : ""}`;
      return { shell: { subject: L(`Pengingat: ${d.title}`, `Reminder: ${d.title}`), preheader: body, kicker: L("Pengingat agenda", "Event reminder"), heading: esc(d.title), intro: para(esc(body)), cta: L("Buka kalender", "Open calendar"), ctaUrl: d.url }, text: [hi, d.title, body], title: L(`Pengingat: ${d.title}`, `Reminder: ${d.title}`), body };
    }
    case "task_due": {
      const t = d.dueIn === 0 ? L("hari ini", "today") : L("3 hari lagi", "in 3 days");
      return { shell: { subject: L(`Tugas jatuh tempo ${t}`, `Task due ${t}`), preheader: d.title, kicker: L("Tugas", "Task"), heading: esc(d.title), intro: para(L(`Jatuh tempo ${t}.`, `Due ${t}.`)), cta: L("Buka checklist", "Open checklist"), ctaUrl: d.url }, text: [hi, d.title], title: L(`Tugas jatuh tempo ${t}`, `Task due ${t}`), body: d.title };
    }
    case "payment_due": {
      const t = d.dueIn === 1 ? L("besok", "tomorrow") : L("7 hari lagi", "in 7 days");
      const body = `${d.payee} · ${d.amount}`;
      return { shell: { subject: L(`Pembayaran jatuh tempo ${t}`, `Payment due ${t}`), preheader: body, kicker: L("Pembayaran", "Payment"), heading: esc(d.payee), intro: para(esc(body)), cta: L("Buka budget", "Open budget"), ctaUrl: d.url }, text: [hi, body], title: L(`Pembayaran jatuh tempo ${t}`, `Payment due ${t}`), body };
    }
  }
}

export type Rendered = { subject: string; html: string; text: string; title: string; body: string };

export function renderEmail(lang: Lang, data: EmailData, opts: { appUrl: string } = { appUrl: "" }): Rendered {
  const b = build(lang, data);
  const html = shell(lang, b.shell, opts.appUrl);
  const text = [...b.text, "", `${b.shell.cta}: ${b.shell.ctaUrl}`, "", "Monaplan"].join("\n");
  return { subject: b.shell.subject, html, text, title: b.title, body: b.body };
}

// Data contoh untuk halaman pratinjau admin
export function sampleData(kind: SentEmailKind, url = "https://monaplan.vercel.app/app/raka-nadia"): EmailData {
  const name = "Raka Pratama";
  const origin = url.replace(/\/app\/.*$/, "");
  switch (kind) {
    case "daily_digest": return {
      kind, name, couple: "Raka & Nadia", dateLabel: "Kamis, 15 Oktober 2026", daysToGo: 127, url,
      agenda: [
        { time: "10.00", end: "11.30", title: "Fitting busana akad", where: "Butik Anggun, Malang", note: "Bawa sepatu dan aksesori" },
        { time: "15.00", end: "16.00", title: "Test food katering", where: "Dapur Sari Rasa" },
        { time: "Seharian", title: "Survei dekorasi pelaminan", where: "Gedung Sabuga", soon: "Besok" },
      ],
      tasks: [
        { title: "Booking fotografer dan videografer", meta: "12–6 bulan · Prioritas tinggi", due: "Hari ini", tone: "danger" },
        { title: "Pilih souvenir pernikahan", meta: "6–3 bulan · Prioritas rendah", due: "3 hari lagi", tone: "caution" },
      ],
      payments: [
        { vendor: "Katering Sari Rasa", meta: "DP · jatuh tempo 16 Okt", amount: "Rp 15.000.000", due: "Besok", tone: "danger" },
        { vendor: "Fotografer Lensa Kita", meta: "Pelunasan · jatuh tempo 22 Okt", amount: "Rp 8.500.000", due: "7 hari lagi", tone: "caution" },
      ],
      paymentTotal: "Rp 23.500.000",
    };
    case "rsvp_digest": return { kind, name, couple: "Raka & Nadia", responses: 3, attending: 2, notAttending: 1, pax: 5, answered: 48, totalGuests: 300, url: `${url}/tamu`,
      recent: [{ name: "Ibu Sari Wulandari", status: "Hadir · 2 orang", attending: true, message: "Selamat ya, semoga lancar!" }, { name: "Bapak Hendra", status: "Hadir · 3 orang", attending: true }, { name: "Dimas Prakoso", status: "Tidak hadir", attending: false, message: "Mohon maaf, sedang di luar kota." }] };
    case "trial_ended": return { kind, name, couple: "Raka & Nadia", plan: "Lifetime Access", price: "Rp 81.950", original: "Rp 149.000", promo: { name: "GUNCANG 10.10", code: "LIFETIME", saving: "Rp 67.050 (45%)", until: "16 Okt 2026" }, url: `${origin}/aktivasi?promo=LIFETIME` };
    case "receipt": return { kind, name, orderNumber: "MNP-20261015-ABC123", plan: "Lifetime Access", original: "Rp 149.000", discount: "GUNCANG 10.10 (-Rp 67.050)", amount: "Rp 81.950", method: "QRIS", validity: "Selamanya", paidAt: "15 Oktober 2026", url: `${origin}/akun/tagihan` };
    case "invitation": return { kind, name: "Nadia Putri", inviter: "Raka Pratama", project: "Raka & Nadia", role: "editor", expiresDays: 7, weddingDate: "Sabtu, 13 Maret 2027", url: `${origin}/gabung/contoh` };
  }
}

export const EMAIL_LABEL: Record<SentEmailKind, { id: string; en: string }> = {
  daily_digest: { id: "Ringkasan harian", en: "Daily summary" },
  rsvp_digest: { id: "Ringkasan RSVP", en: "RSVP digest" },
  trial_ended: { id: "Trial berakhir", en: "Trial ended" },
  receipt: { id: "Kuitansi pembayaran", en: "Payment receipt" },
  invitation: { id: "Undangan kolaborator", en: "Collaborator invitation" },
};
