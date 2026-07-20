"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";
import MikrofonButonu from "@/components/MikrofonButonu";

// KAPANIŞ Faz B — telefon canlı soru dinleyicisi. Emre eğitimde bir soru
// açınca (nabız/tohum) telefonda tam-ekran kart belirir. Yanıtlayınca kapanır.
// Poll ~6 sn; açık soru yoksa hiçbir şey göstermez (sessiz).
//
// KÖK LAYOUT'ta mount edilir → salonun tamamı soruyu görür (eskiden yalnız
// /gorevler'deydi; ana sayfada/başka ekranda olan kişi soruyu kaçırıyordu).
// Projektör (/ekran,/sahne) ve admin sayfalarında GÖRÜNMEZ (pathname guard).
type AcikSoru = { id: string; soru: string; tip: "nabiz" | "tohum"; secenekler: string[] | null };

const POLL_MS = 6000;
// Bu ön eklerde dinleyici çalışmaz: projektör oturumsuz, admin farklı rol.
const HARIC = ["/ekran", "/sahne", "/admin", "/giris"];

export default function CanliSoruDinleyici() {
  const pathname = usePathname();
  const kapali = HARIC.some((p) => pathname?.startsWith(p));

  const [soru, setSoru] = useState<AcikSoru | null>(null);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [tesekkur, setTesekkur] = useState(false);
  // Soru sunucuda kapandı ama kişi hâlâ yazıyor: kartı yok etme, "yine de gönder".
  const [soruKapandi, setSoruKapandi] = useState(false);
  const sonId = useRef<string | null>(null);
  // En güncel metni poll closure'ına taşımadan okumak için ref.
  const metinRef = useRef("");
  useEffect(() => {
    metinRef.current = metin;
  }, [metin]);

  useEffect(() => {
    if (kapali) return;
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
          setSoruKapandi(false);
          sesCal("kart-ac");
          // Overlay açıldı: altta süren bir mikrofon kaydı varsa (görev yanıtı vb.)
          // nazikçe durdur — kayıt görünmeyen formun içine akmasın (mik çakışması).
          try {
            window.dispatchEvent(new CustomEvent("la-kayit-durdur"));
          } catch {
            /* eski tarayıcı — sorun değil */
          }
        } else if (!j.soru) {
          // Soru kapandı. Kişi açık uçlu bir cevap YAZIYORSA kartı yok etme —
          // yazdığını kaybetmesin (tohum cevabı = söz tohumu). Aksi halde kapat.
          if (metinRef.current.trim().length > 0 && !tesekkur) {
            setSoruKapandi(true);
          } else if (!tesekkur) {
            setSoru(null);
          }
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
  }, [tesekkur, kapali]);

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
        setSoruKapandi(false);
        setTimeout(() => setTesekkur(false), 3500);
      }
    } catch {
      /* sessiz */
    } finally {
      setGonderiliyor(false);
    }
  }

  function kapat() {
    setSoru(null);
    setSoruKapandi(false);
    setMetin("");
    sonId.current = soru?.id ?? sonId.current;
  }

  if (kapali) return null;

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
        {soruKapandi && (
          <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200">
            Soru kapandı — yazdığın cevabı yine de gönderebilirsin.
          </p>
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

        {/* Sahnede odaklanamayan / sonra cevaplayacak kişi kartı kapatabilir —
            aksi halde tam-ekran overlay altındaki mikrofon kaydını/formu kilitler. */}
        <button
          onClick={kapat}
          className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          Sonra cevaplayacağım
        </button>
      </div>
    </div>
  );
}
