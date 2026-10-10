import "server-only";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { TZ_LABEL, formatDateLong } from "@/lib/format";

// PDF rundown polos: satu baris judul, tabel bergaris, dan nomor halaman. Tanpa kop dan tanpa kolom tanda tangan.
// Dibuat di server dan tidak bergantung pada tampilan aplikasi.

export type RundownPdfItem = {
  start_time: string;
  end_time: string | null;
  title: string;
  description: string | null;
  pic_name: string | null;
  location: string | null;
  vendor: string | null;
};
export type RundownPdfSection = {
  eventName: string;
  startsAt: string | null;
  venue: string | null;
  items: RundownPdfItem[];
};

// Tanpa pemenggalan kata otomatis: "se-belum" di tabel formal terlihat janggal
Font.registerHyphenationCallback((word) => [word]);

const COL = { no: "6%", time: "17%", dur: "10%", act: "29%", pic: "14%", note: "24%" } as const;
const INK = "#111111";

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 44, fontFamily: "Times-Roman", fontSize: 10, color: INK },
  heading: { fontFamily: "Times-Bold", fontSize: 14 },
  sub: { fontSize: 10, color: "#444444", marginTop: 3, marginBottom: 12 },
  row: { flexDirection: "row", borderLeftWidth: 0.6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: INK },
  head: { flexDirection: "row", borderWidth: 0.6, borderColor: INK, backgroundColor: "#E7E7E7" },
  cell: { paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 0.6, borderRightColor: INK, fontSize: 9.5, lineHeight: 1.3 },
  cellLast: { borderRightWidth: 0 },
  th: { fontFamily: "Times-Bold", textAlign: "center", fontSize: 9.5 },
  center: { textAlign: "center" },
  bold: { fontFamily: "Times-Bold" },
  muted: { color: "#444444" },
  empty: { borderWidth: 0.6, borderColor: INK, padding: 14, textAlign: "center", fontSize: 10 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: "#555555", borderTopWidth: 0.5, borderTopColor: "#888888", paddingTop: 5 },
});

const hhmm = (t: string) => t.slice(0, 5).replace(":", ".");

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function durationLabel(start: string, end: string | null) {
  if (!end) return "-";
  const d = minutes(end) - minutes(start);
  if (d <= 0) return "-";
  const h = Math.floor(d / 60), m = d % 60;
  if (h && m) return `${h} jam ${m} mnt`;
  return h ? `${h} jam` : `${m} mnt`;
}

function Cell({ w, last, children, style }: { w: string; last?: boolean; children: React.ReactNode; style?: any }) {
  return <View style={[s.cell, last ? s.cellLast : {}, { width: w }]}><Text style={style}>{children}</Text></View>;
}

function Section({ sec, tz, printedOn }: { sec: RundownPdfSection; tz: string; printedOn: string }) {
  const zone = TZ_LABEL[tz] ?? "WIB";
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.heading}>Rundown {sec.eventName}</Text>
      <Text style={s.sub}>{[sec.startsAt && formatDateLong(sec.startsAt, tz), sec.venue].filter(Boolean).join("  ·  ")}</Text>

      {sec.items.length === 0 ? (
        <Text style={s.empty}>Belum ada kegiatan pada rundown ini.</Text>
      ) : (
        <View>
          <View style={s.head} fixed wrap={false}>
            <Cell w={COL.no} style={s.th}>NO</Cell>
            <Cell w={COL.time} style={s.th}>WAKTU ({zone})</Cell>
            <Cell w={COL.dur} style={s.th}>DURASI</Cell>
            <Cell w={COL.act} style={s.th}>KEGIATAN</Cell>
            <Cell w={COL.pic} style={s.th}>PIC</Cell>
            <Cell w={COL.note} last style={s.th}>KETERANGAN</Cell>
          </View>
          {sec.items.map((it, i) => {
            const notes = [it.description, it.location && `Lokasi: ${it.location}`, it.vendor && `Vendor: ${it.vendor}`].filter(Boolean).join("\n");
            return (
              <View key={i} style={s.row} wrap={false}>
                <Cell w={COL.no} style={s.center}>{i + 1}</Cell>
                <Cell w={COL.time} style={s.center}>{hhmm(it.start_time)}{it.end_time ? ` – ${hhmm(it.end_time)}` : ""}</Cell>
                <Cell w={COL.dur} style={s.center}>{durationLabel(it.start_time, it.end_time)}</Cell>
                <Cell w={COL.act} style={s.bold}>{it.title}</Cell>
                <Cell w={COL.pic}>{it.pic_name ?? "-"}</Cell>
                <Cell w={COL.note} last>{notes || "-"}</Cell>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.footer} fixed>
        <Text>Dicetak {printedOn}</Text>
        <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function renderRundownPdf(input: { couple: string; tz: string; sections: RundownPdfSection[] }) {
  const printedOn = formatDateLong(new Date(), input.tz);
  const doc = (
    <Document title={`Rundown ${input.couple}`} author="Monaplan" creator="Monaplan" producer="Monaplan">
      {input.sections.map((sec, i) => <Section key={i} sec={sec} tz={input.tz} printedOn={printedOn} />)}
    </Document>
  );
  return renderToBuffer(doc);
}
