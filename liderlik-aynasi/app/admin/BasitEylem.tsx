"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Basit panel #1-4,9 — "Şimdi ne yapmalıyım?" kartının butonu artık işi DOĞRUDAN
// yapar (kontrole götürmek yerine). Mevcut açma/kapama uçlarını çağırır; anlık
// "açılıyor…" geri bildirimi, net başarı mesajı, GERİ AL ve (kritikse) onay sunar.

const SINIF =
  "btn-kor parilti mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-transform hover:scale-[1.01] disabled:opacity-60";

// eylem → uç + gövde + geri-al gövdesi.
function planla(eylem: string, dalga?: number): { url: string; govde: object; ters: object } | null {
  switch (eylem) {
    case "pusula-ac":
      return { url: "/api/admin/pusula", govde: { acik: true }, ters: { acik: false } };
    case "of-ac":
      return { url: "/api/admin/on-farkindalik", govde: { acik: true }, ters: { acik: false } };
    case "rapor-ac":
      return { url: "/api/admin/ayna", govde: { acik: true }, ters: { acik: false } };
    case "dalga-ac":
      return dalga
        ? { url: "/api/admin/dalga", govde: { dalgaId: dalga, acik: true }, ters: { dalgaId: dalga, acik: false } }
        : null;
    case "dalga-kapat":
      return dalga
        ? { url: "/api/admin/dalga", govde: { dalgaId: dalga, acik: false }, ters: { dalgaId: dalga, acik: true } }
        : null;
    default:
      return null;
  }
}

export default function BasitEylem({
  eylem,
  dalga,
  etiket,
  basariMesaj,
  onayMesaj,
}: {
  eylem: string;
  dalga?: number;
  etiket: string;
  basariMesaj: string;
  onayMesaj?: string;
}) {
  const router = useRouter();
  const [durum, setDurum] = useState<"hazir" | "onay" | "calisiyor" | "bitti">("hazir");
  const [hata, setHata] = useState<string | null>(null);

  const plan = planla(eylem, dalga);

  async function yap(govde: object) {
    if (!plan) return;
    setDurum("calisiyor");
    setHata(null);
    try {
      const res = await fetch(plan.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      if (!res.ok) {
        setHata("İşlem başarısız — tekrar dene.");
        setDurum("hazir");
        return;
      }
      setDurum("bitti");
    } catch {
      setHata("Bağlantı sorunu — tekrar dene.");
      setDurum("hazir");
    }
  }

  function basla() {
    if (onayMesaj) setDurum("onay");
    else void yap(plan!.govde);
  }

  // Başarı + geri al + sıradaki adım
  if (durum === "bitti") {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.08] p-4 text-center">
        <p className="text-base font-semibold text-emerald-300">✓ {basariMesaj}</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => plan && void yap(plan.ters)}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            ↶ Geri al
          </button>
          <button
            onClick={() => router.refresh()}
            className="btn-kor rounded-lg px-5 py-2 text-sm font-bold"
          >
            Sıradaki adım →
          </button>
        </div>
      </div>
    );
  }

  // Onay (kritik eylemler)
  if (durum === "onay") {
    return (
      <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-4">
        <p className="text-sm leading-relaxed text-amber-100">{onayMesaj}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void yap(plan!.govde)}
            className="btn-kor flex-1 rounded-lg px-4 py-2.5 text-sm font-bold"
          >
            Evet, yap
          </button>
          <button
            onClick={() => setDurum("hazir")}
            className="rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={basla} disabled={durum === "calisiyor" || !plan} className={SINIF}>
        {durum === "calisiyor" ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-[#1a1206]/70" />
            Açılıyor…
          </span>
        ) : (
          etiket
        )}
      </button>
      {hata && <p className="mt-2 text-center text-sm text-red-300">{hata}</p>}
    </>
  );
}
