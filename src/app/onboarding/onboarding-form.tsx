"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { cn } from "@/components/ui/cn";
import { createProject } from "@/features/project/actions";

const STEPS = ["Nama pasangan", "Tanggal dan kota", "Budget dan tamu"];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-surface p-5 sm:p-6">
      <ol className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-plum-600" : "bg-plum-100")} />
            <span className={cn("mt-2 block text-xs font-medium", i === step ? "text-plum-700" : "text-neutral-500")}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      <ActionForm action={createProject} onSuccess={(r) => r.ok && router.push(`/w/${r.data.id}`)}>
        <div className={cn("flex flex-col gap-4", step !== 0 && "hidden")}>
          <FormGrid>
            <Field label="Nama lengkap mempelai pria" htmlFor="p1"><Input id="p1" name="partner_one_name" required placeholder="Raka Pratama" /></Field>
            <Field label="Panggilan" htmlFor="p1n"><Input id="p1n" name="partner_one_nickname" placeholder="Raka" /></Field>
            <Field label="Nama lengkap mempelai wanita" htmlFor="p2"><Input id="p2" name="partner_two_name" required placeholder="Nadia Putri" /></Field>
            <Field label="Panggilan" htmlFor="p2n"><Input id="p2n" name="partner_two_nickname" placeholder="Nadia" /></Field>
          </FormGrid>
        </div>
        <div className={cn("flex flex-col gap-4", step !== 1 && "hidden")}>
          <Field label="Tanggal pernikahan" htmlFor="date" help="Dipakai untuk menghitung due date checklist. Boleh dikosongkan dulu.">
            <Input id="date" type="date" name="wedding_date" />
          </Field>
          <FormGrid>
            <Field label="Kota" htmlFor="city"><Input id="city" name="city" placeholder="Bandung" /></Field>
            <Field label="Zona waktu" htmlFor="tz">
              <Select id="tz" name="timezone" defaultValue="Asia/Jakarta">
                <option value="Asia/Jakarta">WIB</option>
                <option value="Asia/Makassar">WITA</option>
                <option value="Asia/Jayapura">WIT</option>
              </Select>
            </Field>
          </FormGrid>
        </div>
        <div className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
          <Field label="Total budget" htmlFor="budget"><CurrencyInput id="budget" name="total_budget_idr" placeholder="150.000.000" /></Field>
          <Field label="Perkiraan jumlah tamu" htmlFor="guests"><Input id="guests" type="number" min={0} name="guest_target" placeholder="300" /></Field>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {step > 0 ? (
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setStep(step - 1)}>Kembali</Button>
          ) : <span />}
          <div className="flex gap-2">
            {step > 0 && step < 2 && <Button variant="secondary" onClick={() => setStep(step + 1)}>Lewati</Button>}
            {step < 2 ? (
              <Button
                icon={<ArrowRight />}
                onClick={(e) => {
                  const form = (e.currentTarget as HTMLButtonElement).form!;
                  if (step === 0 && !form.reportValidity()) return;
                  setStep(step + 1);
                }}
              >
                Lanjut
              </Button>
            ) : (
              <SubmitButton>Mulai Merencanakan</SubmitButton>
            )}
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
