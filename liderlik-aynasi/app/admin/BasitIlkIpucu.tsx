"use client";

import { useEffect, useState } from "react";

// Basit panel #10 — İLK GİRİŞTE TEK İPUCU. Paneli ilk açan kişi (ya da yerine
// bakan görevli) tek cümleyle nasıl çalıştığını anlar: "tek kart, tek adım".
// Bir kez kapatılınca bir daha çıkmaz (localStorage). Yalnız Basit görünümde.
const ANAHTAR = "la_basit_ilk_ipucu_v1";

export default function BasitIlkIpucu() {
  // Sunucuda gizli başla (hidrasyon uyumu); mount sonrası localStorage'a bakıp
  // daha önce kapatılmadıysa göster.
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(ANAHTAR)) setGoster(true);
    } catch {}
  }, []);

  if (!goster) return null;

  return (
    <div className="basit-only flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/[0.06] px-4 py-3">
      <span className="text-lg" aria-hidden>
        👋
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-200">
        Bu panel sana <span className="font-semibold text-gold-light">her seferinde tek bir adım</span>{" "}
        gösterir — aşağıdaki butona basman yeter. Daha fazla araç için sağ üstten{" "}
        <span className="font-semibold text-gold-light">Uzman</span>’a geçebilirsin.
      </p>
      <button
        onClick={() => {
          try {
            localStorage.setItem(ANAHTAR, "1");
          } catch {}
          setGoster(false);
        }}
        aria-label="İpucunu kapat"
        className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-white/10 hover:text-gold-light"
      >
        ✕
      </button>
    </div>
  );
}
