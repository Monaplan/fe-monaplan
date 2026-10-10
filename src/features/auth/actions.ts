"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/paths";
import { fail, type ActionResult, okm } from "@/lib/result";

const Email = z.string().trim().toLowerCase().email("Format email belum benar.");
const Password = z.string().min(8, "Password minimal 8 karakter.").max(72);

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

function safeNext(next: FormDataEntryValue | null) {
  return safeNextPath(next);
}

function authMessage(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email atau password salah.";
  if (/email not confirmed/i.test(msg)) return "Email belum dikonfirmasi. Cek kotak masuk (atau folder spam) untuk tautan konfirmasi.";
  if (/already registered|already been registered|user already exists/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/rate limit|too many/i.test(msg)) return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
  if (/password/i.test(msg) && /weak|short|characters/i.test(msg)) return "Password terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.";
  if (/signups not allowed|signup is disabled/i.test(msg)) return "Pendaftaran dengan email sedang dinonaktifkan.";
  return "Terjadi kesalahan. Coba lagi, ya.";
}

export async function signInWithPassword(fd: FormData): Promise<ActionResult> {
  const email = Email.safeParse(fd.get("email"));
  if (!email.success) return fail(email.error.issues[0]!.message);
  const password = String(fd.get("password") ?? "");
  if (!password) return fail("Password wajib diisi.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return fail(authMessage(error.message));
  return { ok: true, data: { redirect: safeNext(fd.get("next")) } };
}

export async function signUpWithPassword(fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    full_name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(80),
    email: Email,
    password: Password,
  }).safeParse({ full_name: fd.get("full_name"), email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  if (fd.get("password") !== fd.get("password_confirm")) return fail("Konfirmasi password tidak sama.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(fd.get("next")))}`,
    },
  });
  if (error) return fail(authMessage(error.message));
  // Supabase mengembalikan user tanpa identities bila email sudah terdaftar
  if (data.user && data.user.identities?.length === 0) return fail("Email ini sudah terdaftar. Silakan masuk.");
  if (data.session) return { ok: true, data: { redirect: safeNext(fd.get("next")) } };
  return okm("Tautan konfirmasi sudah dikirim ke {email}. Buka email itu untuk mengaktifkan akun.", { email: parsed.data.email }, { confirm: true });
}

export async function requestPasswordReset(fd: FormData): Promise<ActionResult> {
  const email = Email.safeParse(fd.get("email"));
  if (!email.success) return fail(email.error.issues[0]!.message);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error && /rate limit|too many/i.test(error.message)) return fail(authMessage(error.message));
  // Pesan sama untuk email terdaftar maupun tidak, agar tidak membocorkan daftar akun
  return { ok: true, message: "Bila email terdaftar, tautan untuk membuat password baru sudah dikirim." };
}

export async function updatePassword(fd: FormData): Promise<ActionResult> {
  const password = Password.safeParse(fd.get("password"));
  if (!password.success) return fail(password.error.issues[0]!.message);
  if (fd.get("password") !== fd.get("password_confirm")) return fail("Konfirmasi password tidak sama.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Sesi reset sudah berakhir. Minta tautan baru, ya.");
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return fail(/different from the old/i.test(error.message) ? "Password baru harus berbeda dari yang lama." : authMessage(error.message));
  return { ok: true, message: "Password berhasil diperbarui." };
}
