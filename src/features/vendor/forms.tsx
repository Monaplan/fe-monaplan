"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectBase } from "@/components/app/project-base";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput, PhoneInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { VENDOR_CATEGORIES, VENDOR_STATUS } from "@/lib/constants";
import { formatIDR } from "@/lib/format";
import { markVendorDeal, savePackage, saveVendor } from "./actions";
import { useT } from "@/i18n/client";

export type Vendor = {
  id: string; category: string; name: string; contact_person: string | null; phone_e164: string | null; email: string | null;
  instagram: string | null; website: string | null; address: string | null; status: string; rating: number | null;
  selected_package_id: string | null; deal_amount_idr: number | null; deal_date: string | null; notes: string | null;
};
export type VendorPackage = { id: string; vendor_id: string; name: string; price_idr: number; description: string | null; inclusions: string | null };

export function VendorFormModal({ projectId, vendor, open, onClose, goToDetail }: { projectId: string; vendor?: Vendor | null; open: boolean; onClose: () => void; goToDetail?: boolean }) {
  const t = useT();
  const router = useRouter();
  const base = useProjectBase();
  return (
    <Modal open={open} onClose={onClose} title={vendor ? t("Ubah Vendor") : t("Tambah Vendor")} size="lg">
      <ActionForm
        action={(fd) => saveVendor(projectId, fd)}
        onSuccess={(r) => {
          onClose();
          if (goToDetail && r.ok && r.data?.id) router.push(`${base}/vendor/${r.data.id}`);
        }}
      >
        {vendor && <input type="hidden" name="id" value={vendor.id} />}
        <FormGrid>
          <Field label={t("Nama vendor")} htmlFor="v-name"><Input id="v-name" name="name" required defaultValue={vendor?.name} /></Field>
          <Field label={t("Kategori")} htmlFor="v-cat">
            <Select id="v-cat" name="category" defaultValue={vendor?.category ?? "Venue"}>
              {VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t("Kontak person")} htmlFor="v-cp"><Input id="v-cp" name="contact_person" defaultValue={vendor?.contact_person ?? ""} /></Field>
          <Field label={t("Nomor WhatsApp")} htmlFor="v-phone"><PhoneInput id="v-phone" name="phone" defaultValue={vendor?.phone_e164?.replace(/^62/, "") ?? ""} /></Field>
          <Field label={t("Email")} htmlFor="v-email"><Input id="v-email" type="email" name="email" defaultValue={vendor?.email ?? ""} /></Field>
          <Field label={t("Instagram")} htmlFor="v-ig"><Input id="v-ig" name="instagram" placeholder="@namavendor" defaultValue={vendor?.instagram ?? ""} /></Field>
          <Field label={t("Website")} htmlFor="v-web"><Input id="v-web" type="url" name="website" placeholder="https://" defaultValue={vendor?.website ?? ""} /></Field>
          <Field label={t("Status")} htmlFor="v-status">
            <Select id="v-status" name="status" defaultValue={vendor?.status ?? "prospek"}>
              {VENDOR_STATUS.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
            </Select>
          </Field>
          <Field label={t("Rating")} htmlFor="v-rating">
            <Select id="v-rating" name="rating" defaultValue={vendor?.rating ?? ""}>
              <option value="">{t("Belum dinilai")}</option>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{"★".repeat(r)}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <Field label={t("Alamat")} htmlFor="v-addr"><Input id="v-addr" name="address" defaultValue={vendor?.address ?? ""} /></Field>
        <Field label={t("Catatan")} htmlFor="v-notes"><Textarea id="v-notes" name="notes" defaultValue={vendor?.notes ?? ""} /></Field>
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}

export function PackageFormModal({ projectId, vendorId, pkg, open, onClose }: { projectId: string; vendorId: string; pkg?: VendorPackage | null; open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={pkg ? t("Ubah Paket") : t("Tambah Paket")}>
      <ActionForm action={(fd) => savePackage(projectId, fd)} onSuccess={onClose}>
        <input type="hidden" name="vendor_id" value={vendorId} />
        {pkg && <input type="hidden" name="id" value={pkg.id} />}
        <Field label={t("Nama paket")} htmlFor="pk-name"><Input id="pk-name" name="name" required defaultValue={pkg?.name} /></Field>
        <Field label={t("Harga")} htmlFor="pk-price"><CurrencyInput id="pk-price" name="price_idr" defaultValue={pkg?.price_idr} /></Field>
        <Field label={t("Isi paket")} htmlFor="pk-inc" help={t("Satu baris per item.")}><Textarea id="pk-inc" name="inclusions" defaultValue={pkg?.inclusions ?? ""} /></Field>
        <Field label={t("Keterangan")} htmlFor="pk-desc"><Textarea id="pk-desc" name="description" defaultValue={pkg?.description ?? ""} /></Field>
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}

export function DealModal({ projectId, vendor, packages, categories, open, onClose }: {
  projectId: string; vendor: Vendor; packages: VendorPackage[]; categories: { id: string; name: string }[]; open: boolean; onClose: () => void;
}) {
  const t = useT();
  const [pkgId, setPkgId] = useState(vendor.selected_package_id ?? packages[0]?.id ?? "");
  const [createBudget, setCreateBudget] = useState(true);
  const pkg = packages.find((p) => p.id === pkgId);
  const guess = categories.find((c) => c.name.toLowerCase().includes(vendor.category.toLowerCase().split(" ")[0]!)) ?? categories[0];
  return (
    <Modal open={open} onClose={onClose} title={t("Tandai deal: {name}", { name: vendor.name })} description={t("Sistem bisa sekaligus membuat item budget serta jadwal DP dan pelunasan.")} size="lg">
      <ActionForm action={(fd) => markVendorDeal(projectId, fd)} onSuccess={onClose}>
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <FormGrid>
          <Field label={t("Paket")} htmlFor="d-pkg">
            <Select id="d-pkg" name="selected_package_id" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              <option value="">{t("Tanpa paket")}</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatIDR(p.price_idr)}</option>)}
            </Select>
          </Field>
          <Field label={t("Nilai deal")} htmlFor="d-amount">
            <CurrencyInput key={pkgId} id="d-amount" name="deal_amount_idr" required defaultValue={vendor.deal_amount_idr ?? pkg?.price_idr} />
          </Field>
          <Field label={t("Tanggal deal")} htmlFor="d-date"><Input id="d-date" type="date" name="deal_date" defaultValue={vendor.deal_date ?? ""} /></Field>
        </FormGrid>
        <label className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-3 text-sm font-medium">
          <Checkbox name="create_budget" checked={createBudget} onChange={(e) => setCreateBudget(e.target.checked)} />{t("Buat item budget dan jadwal pembayaran")}</label>
        {createBudget && (
          <FormGrid>
            <Field label={t("Kategori budget")} htmlFor="d-cat" className="sm:col-span-2">
              <Select id="d-cat" name="category_id" defaultValue={guess?.id}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t("Nominal DP")} htmlFor="d-dp"><CurrencyInput id="d-dp" name="dp_amount_idr" /></Field>
            <Field label={t("Jatuh tempo DP")} htmlFor="d-dpdue"><Input id="d-dpdue" type="date" name="dp_due_date" /></Field>
            <Field label={t("Jatuh tempo pelunasan")} htmlFor="d-final" help={t("Sisa nilai deal setelah DP.")}>
              <Input id="d-final" type="date" name="final_due_date" />
            </Field>
          </FormGrid>
        )}
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Tandai Deal")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}
