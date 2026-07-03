"use client";

import { useState } from "react";
import CanliAyna from "@/components/CanliAyna";
import { tr } from "@/lib/i18n/tr";

const t = tr.canliAyna;

// Profil (/ben) sayfasında avatarın altındaki "Fotoğrafını değiştir" girişi.
// Katılımcının fotoğrafını değiştirmek için bakacağı doğal yer burası — açılınca
// CanliAyna panelini gösterir (yeniden çek + ekstra referans). yuzVar: kişinin
// zaten Canlı Ayna karesi var mı (varsa panel "hazır" halinde açılır).
export default function FotoDegistirBlok({ yuzVar }: { yuzVar: boolean }) {
  const [acik, setAcik] = useState(false);

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
      >
        {t.degistir}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <CanliAyna varMi={yuzVar} />
      <button
        type="button"
        onClick={() => setAcik(false)}
        className="text-xs font-medium text-slate-500 hover:text-slate-300"
      >
        {t.degistirKapat}
      </button>
    </div>
  );
}
