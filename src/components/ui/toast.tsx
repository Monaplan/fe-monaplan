"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "./cn";

type Toast = { id: number; message: string; tone: "positive" | "danger" };
const ToastCtx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "positive") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col gap-2 md:inset-x-auto md:top-auto md:bottom-6 md:left-6 md:w-96" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="animate-sheet-in pointer-events-auto flex items-start gap-3 rounded-lg border border-neutral-200 bg-surface p-3 shadow-pop">
            <span className={cn("mt-0.5 [&_svg]:size-[18px]", t.tone === "danger" ? "text-danger" : "text-plum-600")}>
              {t.tone === "danger" ? <CircleAlert /> : <CircleCheck />}
            </span>
            <p className="flex-1 text-sm text-neutral-800">{t.message}</p>
            <button aria-label="Tutup" className="text-neutral-400 hover:text-neutral-700" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
