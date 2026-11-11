"use client";

import { createContext, useContext } from "react";
import { EMPTY_CONTACT, whatsappLink, type ContactInfo } from "@/lib/support";

// Kontak Monaplan dari server (layout) ke komponen klien, supaya perubahan di admin langsung berlaku tanpa build ulang
const Ctx = createContext<ContactInfo>(EMPTY_CONTACT);

export function ContactProvider({ value, children }: { value: ContactInfo; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useContact = () => useContext(Ctx);

// Tautan WhatsApp admin dengan pesan terisi; null bila nomor belum diatur
export function useSupportWhatsapp() {
  const { whatsapp } = useContext(Ctx);
  return (text?: string) => whatsappLink(whatsapp, text);
}
