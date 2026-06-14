"use client";

import { useState, type ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.onay;

// #10 Güvenli geri-alma: kritik (akışı bozabilecek) bir eylemden önce tek
// dokunuşla "Emin misin?" sorar. İlk dokunuş eylemi TETİKLEMEZ — yalnız onay
// satırını açar; "Vazgeç" güvenli geri-almadır, "Evet" gerçek eylemi yapar.
export default function OnayliDugme({
  onayMetni,
  onaylandi,
  disabled,
  className,
  children,
}: {
  onayMetni: string;
  onaylandi: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [soruyor, setSoruyor] = useState(false);

  if (soruyor) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-xs text-right text-xs font-medium text-amber-300">
          {onayMetni}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSoruyor(false);
              onaylandi();
            }}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-400"
          >
            {t.evet}
          </button>
          <button
            onClick={() => setSoruyor(false)}
            className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-midnight-soft"
          >
            {t.vazgec}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setSoruyor(true)} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
