"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// [1.5] SALON DAVETİ akışı: isim yaz → AYNA taslak üretir → düzenle → "Gönderdim".
// Sistem mesaj GÖNDERMEZ; kişi kendi WhatsApp'ından atar. Bu ekran yalnız taslak
// verir + kaydı işaretler.
type Asama = "isim" | "uretiliyor" | "taslak" | "bitti";

export default function SalonDaveti({ zatenGonderildi }: { zatenGonderildi: boolean }) {
  const [asama, setAsama] = useState<Asama>(zatenGonderildi ? "bitti" : "isim");
  const [isim, setIsim] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [taslak, setTaslak] = useState("");
  const [hata, setHata] = useState(false);

  async function uret() {
    if (isim.trim().length < 2 || asama === "uretiliyor") return;
    setAsama("uretiliyor");
    setHata(false);
    try {
      const r = await fetch("/api/salon-daveti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isim }),
      });
      const v = await r.json().catch(() => null);
      if (r.ok && v?.taslak) {
        setId(v.id);
        setTaslak(v.taslak);
        setAsama("taslak");
        titret([10, 30, 10]);
      } else {
        setHata(true);
        setAsama("isim");
      }
    } catch {
      setHata(true);
      setAsama("isim");
    }
  }

  async function gonderildi() {
    if (!id) return;
    try {
      await fetch("/api/salon-daveti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ islem: "gonderildi", id, taslak }),
      });
    } catch {
      /* sessiz — kayıt kritik değil, kişi mesajı zaten attı */
    }
    titret([12, 40, 12, 40, 30]);
    setAsama("bitti");
  }

  if (asama === "bitti") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6 text-center">
        <p className="text-4xl" aria-hidden>🕊️</p>
        <p className="mt-2 text-lg font-semibold text-emerald-300">Davetin yola çıktı.</p>
        <p className="mt-1 text-sm text-slate-400">Bir isim, bir cesaret. Bu salondan çıkan davetlerden birisin.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-5">
      <p className="prizma-serif ay-metin text-lg font-semibold">Bir isim yaz</p>
      <p className="mt-1 text-sm text-slate-400">
        Aklına gelen tek bir kişi — AYNA sana kısa bir davet taslağı hazırlayacak. Mesajı sen, kendi telefonundan atacaksın.
      </p>

      {asama !== "taslak" && (
        <>
          <input
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
            maxLength={60}
            placeholder="Örn. Zeynep"
            className="mt-4 h-12 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] px-4 text-center text-lg text-slate-100 outline-none focus:border-gold"
          />
          {hata && <p className="mt-2 text-center text-sm text-rose-300">Taslak üretilemedi, tekrar dene.</p>}
          <button
            onClick={() => void uret()}
            disabled={isim.trim().length < 2 || asama === "uretiliyor"}
            className="btn-kor parilti mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
          >
            {asama === "uretiliyor" ? "AYNA yazıyor…" : "Davet taslağı hazırla"}
          </button>
        </>
      )}

      {asama === "taslak" && (
        <>
          <label className="mt-4 block text-sm font-medium text-slate-300">Taslağın (düzenleyebilirsin)</label>
          <textarea
            value={taslak}
            onChange={(e) => setTaslak(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-gold"
          />
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(taslak)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-base font-bold text-emerald-300"
            >
              📲 WhatsApp&apos;ta aç
            </a>
            <button
              onClick={() => void gonderildi()}
              className="btn-kor flex h-12 items-center justify-center rounded-2xl text-base font-bold"
            >
              Gönderdim ✓
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Mesajı sen atıyorsun — sistem senin adına hiçbir şey göndermez.
          </p>
        </>
      )}
    </div>
  );
}
