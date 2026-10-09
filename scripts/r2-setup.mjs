// Cek koneksi ke Cloudflare R2 dan pasang aturan CORS agar browser bisa mengunggah langsung (presigned PUT).
// Jalankan: npm run r2:setup  [origin tambahan, misal https://abc.trycloudflare.com]
import { GetBucketCorsCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT, NEXT_PUBLIC_APP_URL } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Isi R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, dan R2_BUCKET di .env dulu.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const origins = [...new Set(["http://localhost:3000", NEXT_PUBLIC_APP_URL, ...process.argv.slice(2)].filter(Boolean).map((o) => o.replace(/\/$/, "")))];

try {
  await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
  console.log(`✓ Terhubung ke bucket "${R2_BUCKET}"`);
} catch (e) {
  console.error(`✗ Bucket "${R2_BUCKET}" tidak bisa diakses: ${e.name} ${e.message}`);
  console.error("  Pastikan bucket sudah dibuat dan API token punya izin Object Read & Write untuk bucket ini.");
  process.exit(1);
}

const rule = {
  AllowedOrigins: origins,
  AllowedMethods: ["PUT", "GET", "HEAD"],
  AllowedHeaders: ["content-type", "content-length"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
};

// Cek CORS yang sudah aktif lewat preflight, sama seperti yang dilakukan browser
async function preflight(origin) {
  const url = `${R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${R2_BUCKET}/cors-check`;
  const res = await fetch(url, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
  return res.headers.get("access-control-allow-origin") === origin || res.headers.get("access-control-allow-origin") === "*";
}

try {
  await s3.send(new PutBucketCorsCommand({ Bucket: R2_BUCKET, CORSConfiguration: { CORSRules: [rule] } }));
  const cors = await s3.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
  console.log("✓ CORS terpasang untuk origin:");
  for (const o of cors.CORSRules?.[0]?.AllowedOrigins ?? []) console.log("   -", o);
} catch (e) {
  if (e.name !== "AccessDenied" && e.Code !== "AccessDenied") throw e;
  // Token Object Read & Write tidak boleh mengubah pengaturan bucket (memang sebaiknya begitu)
  const status = await Promise.all(origins.map(async (o) => [o, await preflight(o)]));
  if (status.every(([, ok]) => ok)) {
    console.log("✓ CORS sudah aktif untuk semua origin:");
    for (const [o] of status) console.log("   -", o);
  } else {
    console.log("! Token ini tidak boleh mengubah CORS bucket (normal untuk token Object Read & Write).");
    for (const [o, ok] of status) console.log(`   ${ok ? "✓" : "✗"} ${o}`);
    console.log(`\nPasang manual: Cloudflare Dashboard → R2 → bucket "${R2_BUCKET}" → Settings → CORS Policy → Add CORS policy,`);
    console.log("lalu tempel JSON berikut dan Save. Setelah itu jalankan npm run r2:setup lagi untuk mengecek.\n");
    console.log(JSON.stringify([{ AllowedOrigins: rule.AllowedOrigins, AllowedMethods: rule.AllowedMethods, AllowedHeaders: rule.AllowedHeaders, ExposeHeaders: rule.ExposeHeaders, MaxAgeSeconds: rule.MaxAgeSeconds }], null, 2));
    process.exitCode = 1;
  }
}
