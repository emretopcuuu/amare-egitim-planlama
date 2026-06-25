"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ONAY = "YENİ KAMP";

// #4 — Yeni kamp hazırla. TÜM katılımcı verisini siler; yapı korunur. Yanlışlıkla
// basılmasın diye yazılı onay ("YENİ KAMP") ister.
export default function YeniKampButonu() {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function sifirla() {
    if (metin !== ONAY || calisiyor) return;
    setCalisiyor(true);
    setMesaj(null);
    try {
      const res = await fetch("/api/admin/yeni-kamp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ onay: metin }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok) {
        setMesaj("✓ Yeni kamp hazır — tüm katılımcı verisi temizlendi.");
        setMetin("");
        setAcik(false);
        router.refresh();
      } else {
        setMesaj(v?.hata ?? "İşlem başarısız.");
      }
    } catch {
      setMesaj("İşlem başarısız.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-5">
      <h3 className="text-base font-semibold text-red-200">🔁 Yeni Kamp Hazırla</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">
        Bir sonraki kamp için sıfırla. <span className="font-semibold text-red-200">TÜM katılımcılar
        ve verileri</span> (görevler, puanlar, Pusula, takdirler, raporlar, sesler…) kalıcı silinir.
        Yapı korunur: özellikler, dalga ayarları, yönetici hesabı. <span className="font-semibold">Geri
        alınamaz.</span>
      </p>
      {!acik ? (
        <button
          onClick={() => setAcik(true)}
          className="mt-3 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
        >
          Sıfırlamak istiyorum
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-400">
            Onaylamak için <span className="font-mono font-bold text-red-200">{ONAY}</span> yaz:
          </p>
          <input
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            placeholder={ONAY}
            className="h-10 w-full rounded-lg border border-red-500/40 bg-midnight-soft px-3 text-sm text-slate-100 outline-none focus:border-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={sifirla}
              disabled={metin !== ONAY || calisiyor}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
            >
              {calisiyor ? "Sıfırlanıyor…" : "Kalıcı olarak sıfırla"}
            </button>
            <button
              onClick={() => {
                setAcik(false);
                setMetin("");
              }}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {mesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>}
    </div>
  );
}
