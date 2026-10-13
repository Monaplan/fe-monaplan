import "server-only";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PARTY_SIDE, labelOf } from "@/lib/constants";
import { TZ_LABEL, formatDateLong, formatTime } from "@/lib/format";

// PDF daftar tamu hadir: judul, ringkasan, tabel bergaris biasa, dan nomor halaman. Gaya mengikuti rundown.tsx.
// Dibuat di server dan tidak bergantung pada tampilan aplikasi.

export type ArrivedPdfGuest = {
  name: string;
  group: string | null;
  side: string | null;
  pax: number;
  checkedInAt: string;
  checkedInBy: string | null;
};

// Tanpa pemenggalan kata otomatis: "se-belum" di tabel formal terlihat janggal
Font.registerHyphenationCallback((word) => [word]);

const COL = { no: "6%", name: "28%", group: "17%", side: "12%", pax: "8%", time: "13%", by: "16%" } as const;
const INK = "#111111";

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 44, fontFamily: "Times-Roman", fontSize: 10, color: INK },
  heading: { fontFamily: "Times-Bold", fontSize: 14 },
  sub: { fontSize: 10, color: "#444444", marginTop: 3 },
  summary: { fontSize: 10, marginTop: 3, marginBottom: 12 },
  row: { flexDirection: "row", borderLeftWidth: 0.6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: INK },
  head: { flexDirection: "row", borderWidth: 0.6, borderColor: INK, backgroundColor: "#E7E7E7" },
  cell: { paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 0.6, borderRightColor: INK, fontSize: 9.5, lineHeight: 1.3 },
  cellLast: { borderRightWidth: 0 },
  th: { fontFamily: "Times-Bold", textAlign: "center", fontSize: 9.5 },
  center: { textAlign: "center" },
  bold: { fontFamily: "Times-Bold" },
  empty: { borderWidth: 0.6, borderColor: INK, padding: 14, textAlign: "center", fontSize: 10 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: "#555555", borderTopWidth: 0.5, borderTopColor: "#888888", paddingTop: 5 },
});

function Cell({ w, last, children, style }: { w: string; last?: boolean; children: React.ReactNode; style?: any }) {
  return <View style={[s.cell, last ? s.cellLast : {}, { width: w }]}><Text style={style}>{children}</Text></View>;
}

function Doc({ couple, tz, weddingDate, guests, printedOn }: { couple: string; tz: string; weddingDate: string | null; guests: ArrivedPdfGuest[]; printedOn: string }) {
  const zone = TZ_LABEL[tz] ?? "WIB";
  const totalPax = guests.reduce((sum, g) => sum + g.pax, 0);
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.heading}>Daftar Tamu Hadir {couple}</Text>
      {weddingDate && <Text style={s.sub}>{formatDateLong(weddingDate, tz)}</Text>}
      <Text style={s.summary}>{guests.length} tamu  ·  {totalPax} orang</Text>

      {guests.length === 0 ? (
        <Text style={s.empty}>Belum ada tamu yang melakukan check-in.</Text>
      ) : (
        <View>
          <View style={s.head} fixed wrap={false}>
            <Cell w={COL.no} style={s.th}>NO</Cell>
            <Cell w={COL.name} style={s.th}>NAMA</Cell>
            <Cell w={COL.group} style={s.th}>GRUP</Cell>
            <Cell w={COL.side} style={s.th}>PIHAK</Cell>
            <Cell w={COL.pax} style={s.th}>ORANG</Cell>
            <Cell w={COL.time} style={s.th}>MASUK ({zone})</Cell>
            <Cell w={COL.by} last style={s.th}>PETUGAS</Cell>
          </View>
          {guests.map((g, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Cell w={COL.no} style={s.center}>{i + 1}</Cell>
              <Cell w={COL.name} style={s.bold}>{g.name}</Cell>
              <Cell w={COL.group}>{g.group ?? "-"}</Cell>
              <Cell w={COL.side}>{g.side ? labelOf(PARTY_SIDE, g.side) : "-"}</Cell>
              <Cell w={COL.pax} style={s.center}>{g.pax}</Cell>
              <Cell w={COL.time} style={s.center}>{formatTime(g.checkedInAt, tz, false)}</Cell>
              <Cell w={COL.by} last>{g.checkedInBy ?? "-"}</Cell>
            </View>
          ))}
        </View>
      )}

      <View style={s.footer} fixed>
        <Text>Dicetak {printedOn}</Text>
        <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function renderTamuHadirPdf(input: { couple: string; tz: string; weddingDate: string | null; guests: ArrivedPdfGuest[] }) {
  const printedOn = formatDateLong(new Date(), input.tz);
  const doc = (
    <Document title={"Daftar Tamu Hadir " + input.couple} author="Monaplan" creator="Monaplan" producer="Monaplan">
      <Doc {...input} printedOn={printedOn} />
    </Document>
  );
  return renderToBuffer(doc);
}
