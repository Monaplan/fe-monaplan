import { Logo } from "./logo";

// Kepala halaman fokus (aktivasi, onboarding): logo di kiri, keluar di kanan, sama di semua halaman
export function FocusHeader() {
  return (
    <div className="flex items-center justify-between">
      <Logo href="/mulai" />
      <form action="/auth/signout" method="post">
        <button className="text-[13px] text-neutral-600 hover:text-plum-700">Keluar</button>
      </form>
    </div>
  );
}
