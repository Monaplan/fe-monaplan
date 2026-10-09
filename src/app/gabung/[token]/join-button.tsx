"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/features/project/actions";
import { projectPath } from "@/lib/paths";
import { useT } from "@/i18n/client";

export function JoinButton({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button size="lg" className="mt-6 w-full" loading={pending} onClick={() => start(async () => {
        const r = await acceptInvitation(token);
        if (r.ok) router.push(projectPath({ id: r.data.projectId, slug: r.data.slug }));
        else setError(r.error);
      })}>{t("Gabung Sekarang")}</Button>
      {error && <p className="mt-3 text-[13px] text-danger">{t(error)}</p>}
    </>
  );
}
