"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, MailCheck, Sparkles, UserRound } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/components/ui/cn";
import { signInWithPassword, signUpWithPassword } from "@/features/auth/actions";
import { GoogleButton } from "./google-button";
import { AuthHeading } from "@/components/app/auth-layout";

const HEADINGS = {
  masuk: { title: "Selamat datang kembali", subtitle: "Masuk untuk melanjutkan persiapan pernikahan kalian." },
  daftar: { title: "Buat akun", subtitle: "Mulai merencanakan hari bahagia kalian dalam beberapa menit." },
};

export function IconInput({ icon, className, ...rest }: React.ComponentProps<typeof Input> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400 [&_svg]:size-4">{icon}</span>
      <Input className={cn("h-11 pl-10", className)} {...rest} />
    </div>
  );
}

export function PasswordInput({ id, name, autoComplete, placeholder = "••••••••" }: { id: string; name: string; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"><Lock className="size-4" /></span>
      <Input id={id} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} placeholder={placeholder} className="h-11 pr-11 pl-10" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthForm({ mode: initial, next, notice, trialDays }: { mode: "masuk" | "daftar"; next?: string; notice?: string; trialDays?: number | null }) {
  const router = useRouter();
  const [mode, setMode] = useState(initial);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 text-center shadow-card">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-plum-50 text-plum-600 ring-1 ring-plum-100"><MailCheck className="size-6" /></span>
        <h2 className="mt-4 text-lg font-semibold">Cek email kamu</h2>
        <p className="mt-1 text-[13px] leading-5 text-neutral-600">{sentTo}</p>
        <button onClick={() => { setSentTo(null); setMode("masuk"); }} className="mt-5 text-[13px] font-semibold text-plum-600 hover:underline">Kembali ke halaman masuk</button>
      </div>
    );
  }

  const go = (r: { ok: boolean; data?: any; message?: string }) => {
    if (!r.ok) return;
    if (r.data?.confirm) setSentTo(r.message ?? "Cek email untuk konfirmasi.");
    else if (r.data?.redirect) { router.replace(r.data.redirect); router.refresh(); }
  };

  return (
    <div>
      <AuthHeading title={HEADINGS[mode].title} subtitle={HEADINGS[mode].subtitle} reserveLines />
      {notice && <p role="alert" className="mt-6 rounded-xl bg-danger-bg px-4 py-3 text-[13px] text-danger">{notice}</p>}
      <div className="h-8" />
      <Segmented
        className="mb-6"
        fullWidth
        value={mode}
        onChange={(m) => { setMode(m); window.history.replaceState(null, "", m === "daftar" ? "/login?mode=daftar" : "/login"); }}
        items={[{ key: "masuk", label: "Masuk" }, { key: "daftar", label: "Daftar" }]}
      />

      {mode === "masuk" ? (
        <ActionForm key="masuk" action={signInWithPassword} onSuccess={go}>
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email" htmlFor="li-email"><IconInput icon={<Mail />} id="li-email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></Field>
          <Field label={<span className="flex items-center justify-between">Password<Link href="/lupa-password" className="text-[12.5px] font-medium text-plum-600 hover:underline">Lupa password?</Link></span>} htmlFor="li-pass">
            <PasswordInput id="li-pass" name="password" autoComplete="current-password" />
          </Field>
          <SubmitButton size="lg" className="mt-1 w-full">Masuk</SubmitButton>
        </ActionForm>
      ) : (
        <ActionForm key="daftar" action={signUpWithPassword} onSuccess={go}>
          <input type="hidden" name="next" value={next ?? ""} />
          {trialDays ? (
            <p className="flex items-center gap-2 rounded-xl bg-plum-50 px-3.5 py-2.5 text-[13px] leading-5 text-plum-800 ring-1 ring-plum-100">
              <Sparkles className="size-4 shrink-0 text-plum-600" />Coba gratis {trialDays} hari. Tanpa kartu kredit, tanpa pilih paket.
            </p>
          ) : null}
          <Field label="Nama lengkap" htmlFor="su-name"><IconInput icon={<UserRound />} id="su-name" name="full_name" required autoComplete="name" placeholder="Raka Pratama" /></Field>
          <Field label="Email" htmlFor="su-email"><IconInput icon={<Mail />} id="su-email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></Field>
          <Field label="Password" htmlFor="su-pass" help="Minimal 8 karakter."><PasswordInput id="su-pass" name="password" autoComplete="new-password" /></Field>
          <Field label="Ulangi password" htmlFor="su-pass2"><PasswordInput id="su-pass2" name="password_confirm" autoComplete="new-password" /></Field>
          <SubmitButton size="lg" className="mt-1 w-full">Buat Akun</SubmitButton>
        </ActionForm>
      )}

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200" />atau<span className="h-px flex-1 bg-neutral-200" />
      </div>
      <GoogleButton next={next} />

      <p className="mt-6 text-center text-[13px] text-neutral-600">
        {mode === "masuk" ? "Belum punya akun? " : "Sudah punya akun? "}
        <button type="button" className="font-semibold text-plum-600 hover:underline" onClick={() => setMode(mode === "masuk" ? "daftar" : "masuk")}>
          {mode === "masuk" ? "Daftar gratis" : "Masuk"}
        </button>
      </p>
    </div>
  );
}
