"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// UX #2 — Terimler sözlüğü. Paneldeki içeriden kelimelerin sade Türkçe karşılığı.
// Dışarıdan gelen yönetici "Dalga ne demek?" diye takılmasın.
const TERIMLER: { terim: string; aciklama: string }[] = [
  { terim: "Dalga", aciklama: "Değerlendirme turu. Katılımcıların birbirini puanladığı dönem (Dalga 1, 2, 3)." },
  { terim: "Mühür", aciklama: "Kamp kilidi. Açılınca katılımcıların Ayna Raporu görünür olur." },
  { terim: "Funnel / Aşamalar", aciklama: "Kampın 5 aşaması: Hazırlık → Katılım → Kamp Canlı → Final → Sonrası." },
  { terim: "Pusula", aciklama: "Katılımcının kamp öncesi doldurduğu 'neden/iç engel' çalışması." },
  { terim: "Triyaj", aciklama: "Risk listesi. Sessizleşen / geride kalan katılımcıların öne çıkarıldığı liste." },
  { terim: "Kiosk", aciklama: "Ortak tablet modu. Girişte paylaşılan bir cihazdan sırayla işlem." },
  { terim: "AYNA Direktörü", aciklama: "Kampı yöneten yapay zekânın kontrol ekranı (sahne, duyuru, akış)." },
  { terim: "Komutan", aciklama: "Canlı analiz ekranı: ekip radarı, momentum, istatistikler." },
  { terim: "Elmas / Kıvılcım", aciklama: "Katılımcıların görevlerden kazandığı puan ve unvan sistemi." },
  { terim: "Boşluk Anı", aciklama: "Gün 3 zirvesi: kişinin iç engelini kamptaki kanıtla yüzleştirme adımı." },
  { terim: "Ayna Eşi", aciklama: "Katılımcıya atanan, onu gözlemleyen gizli eş." },
  { terim: "Yansıma", aciklama: "Katılımcının kendi sesinden konuşan kişisel video/ses mesajları." },
];

export default function TerimlerSozluk() {
  const [acik, setAcik] = useState(false);
  const [yerlesti, setYerlesti] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setYerlesti(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="rounded-full border border-royal-light/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-gold hover:text-gold-light"
      >
        📖 Terimler
      </button>
      {acik &&
        yerlesti &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAcik(false);
            }}
          >
            <div className="my-auto w-full max-w-md rounded-2xl bg-midnight-card p-6 shadow-2xl ring-1 ring-gold/30">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gold-light">📖 Terimler sözlüğü</h3>
                <button
                  onClick={() => setAcik(false)}
                  aria-label="Kapat"
                  className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Paneldeki özel kelimelerin sade karşılığı.
              </p>
              <dl className="mt-4 space-y-3">
                {TERIMLER.map((x) => (
                  <div key={x.terim} className="rounded-xl border border-royal/20 bg-white/[0.02] p-3">
                    <dt className="text-sm font-bold text-gold-light">{x.terim}</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-slate-300">{x.aciklama}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
