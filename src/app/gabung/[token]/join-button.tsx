"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/features/project/actions";

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button size="lg" className="mt-6 w-full" loading={pending} onClick={() => start(async () => {
        const r = await acceptInvitation(token);
        if (r.ok) router.push(`/w/${r.data.projectId}`);
        else setError(r.error);
      })}>
        Gabung Sekarang
      </Button>
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
    </>
  );
}
