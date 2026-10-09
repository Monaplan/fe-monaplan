// reserveLines: sisakan tinggi subjudul agar judul dan tab di bawahnya tidak melompat saat teks berganti
export function AuthHeading({ title, subtitle, reserveLines }: { title: string; subtitle?: string; reserveLines?: boolean }) {
  return (
    <>
      <h1 className="font-display text-[34px] leading-10 font-medium text-neutral-900">{title}</h1>
      {subtitle && <p className={reserveLines ? "mt-2 min-h-11 text-[14px] leading-[22px] text-neutral-600" : "mt-2 text-[14px] leading-[22px] text-neutral-600"}>{subtitle}</p>}
    </>
  );
}
