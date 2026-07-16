"use client";

import { useEffect, useRef, useState } from "react";
import { sesCal } from "@/lib/sesEfekti";
import MikrofonButonu from "@/components/MikrofonButonu";

// KAPANIŞ Faz B — telefon canlı soru dinleyicisi. Emre eğitimde bir soru
// açınca (nabız/tohum) telefonda tam-ekran kart belirir. Yanıtlayınca kapanır.
// Poll ~6 sn; açık soru yoksa hiçbir şey göstermez (sessiz).
type AcikSoru = { id: string; soru: string; tip: "nabiz" | "tohum"; secenekler: string[] | null };

const POLL_MS = 6000;

export default function CanliSoruDinleyici() {
  const [soru, setSoru] = useState<AcikSoru | null>(null);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [tesekkur, setTesekkur] = useState(false);
  const sonId = useRef<string | null>(null);

  useEffect(() => {
    let iptal = false;
    async function yokla() {
      try {
        const r = await fetch("/api/canli-soru", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { soru: AcikSoru | null };
        if (iptal) return;
        if (j.soru && j.soru.id !== sonId.current) {
          sonId.current = j.soru.id;
          setSoru(j.soru);
          setMetin("");
          setTesekkur(false);
          sesCal("kart-ac");
        } else if (!j.soru && !tesekkur) {
          setSoru(null);
        }
      } catch {
        /* sessiz */
      }
    }
    yokla();
    const id = setInterval(yokla, POLL_MS);
    return () => {
      iptal = true;
      clearInterval(id);
    };
  }, [tesekkur]);

  async function yanitla(yanit: string) {
    if (!soru || gonderiliyor || yanit.trim().length < 1) return;
    setGonderiliyor(true);
    try {
      const r = await fetch("/api/canli-soru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ soruId: soru.id, yanit }),
      });
      if (r.ok) {
        sesCal("muhur");
        setTesekkur(true);
        setSoru(null);
        setTimeout(() => setTesekkur(false), 3500);
      }
    } catch {
      /* sessiz */
    } finally {
      setGonderiliyor(false);
    }
  }

  if (tesekkur) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020a12]/90 p-6 text-center">
        <div className="kart-cam rounded-3xl px-8 py-10">
          <p className="text-5xl">🌱</p>
          <p className="prizma-serif mt-4 text-xl font-semibold text-gold">Yanıtın kaydedildi.</p>
          <p className="mt-1 text-sm text-slate-300">Ekrana bak — salon birlikte cevaplıyor.</p>
        </div>
      </div>
    );
  }

  if (!soru) return null;

  const tohum = soru.tip === "tohum";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020a12]/92 p-5">
      <div className="kart-cam w-full max-w-sm rounded-3xl px-6 py-7">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light/70">
          {tohum ? "🌱 Emre'nin Sorusu" : "⚡ Canlı Soru"}
        </p>
        <h2 className="prizma-serif mt-2 text-2xl font-bold leading-snug text-white">{soru.soru}</h2>
        {tohum && (
          <p className="mt-2 text-sm text-gold-light/80">Cevabın, birazdan vereceğin sözün tohumu olacak.</p>
        )}

        {soru.secenekler && soru.secenekler.length > 0 ? (
          <div className="mt-5 grid gap-2.5">
            {soru.secenekler.map((s) => (
              <button
                key={s}
                onClick={() => yanitla(s)}
                disabled={gonderiliyor}
                className="btn-kor min-h-12 rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Buraya yaz…"
              className="w-full resize-none rounded-xl border border-royal/40 bg-midnight/60 p-3 text-base text-slate-100 outline-none focus:border-gold/50"
            />
            {/* Sahne anında telefonla yazmak zor — sesle yaz burada kritik. */}
            <div className="mt-2">
              <MikrofonButonu
                onMetin={(p) => setMetin((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 600))}
              />
            </div>
            <button
              onClick={() => yanitla(metin)}
              disabled={gonderiliyor || metin.trim().length < 1}
              className="btn-kor mt-2 h-12 w-full rounded-xl text-base font-bold disabled:opacity-50"
            >
              {gonderiliyor ? "Gönderiliyor…" : "Gönder"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
