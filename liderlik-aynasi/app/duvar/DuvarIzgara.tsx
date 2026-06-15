"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import Avatar from "@/components/Avatar";

const t = tr.duvar;

type Foto = {
  id: string;
  url: string | null;
  caption: string | null;
  begeniSayi: number;
  begendim: boolean;
  yorumSayi: number;
};
type Yorum = { id: string; yorum: string; ad: string; avatar: string | null };
type Durum = { begeniSayi: number; begendim: boolean; yorumSayi: number };

// Anı Duvarı ızgarası: fotoğrafa dokun → tam ekran detay (kalp + yorumlar).
export default function DuvarIzgara({ fotolar }: { fotolar: Foto[] }) {
  const [durum, setDurum] = useState<Record<string, Durum>>(() =>
    Object.fromEntries(
      fotolar.map((f) => [
        f.id,
        { begeniSayi: f.begeniSayi, begendim: f.begendim, yorumSayi: f.yorumSayi },
      ])
    )
  );
  const [secili, setSecili] = useState<string | null>(null);
  const [yorumlar, setYorumlar] = useState<Yorum[] | null>(null);
  const [yeni, setYeni] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const sec = fotolar.find((f) => f.id === secili) ?? null;

  async function ac(id: string) {
    setSecili(id);
    setYorumlar(null);
    setYeni("");
    try {
      const res = await fetch(`/api/duvar-yorumlar?fotoId=${id}`);
      const v = await res.json();
      setYorumlar(v.yorumlar ?? []);
    } catch {
      setYorumlar([]);
    }
  }

  async function begen(id: string) {
    titret(10);
    // Optimistik: anında çevir; sunucu yanıtıyla uzlaş, hata olursa geri al.
    const onceki = durum[id];
    setDurum((d) => ({
      ...d,
      [id]: {
        ...d[id],
        begendim: !d[id].begendim,
        begeniSayi: d[id].begeniSayi + (d[id].begendim ? -1 : 1),
      },
    }));
    try {
      const res = await fetch("/api/duvar-begeni", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fotoId: id }),
      });
      if (!res.ok) throw new Error();
      const v = await res.json();
      setDurum((d) => ({
        ...d,
        [id]: { ...d[id], begeniSayi: v.sayi, begendim: v.begenildi },
      }));
    } catch {
      setDurum((d) => ({ ...d, [id]: onceki }));
    }
  }

  async function yorumGonder() {
    if (!secili || yeni.trim().length < 1 || yukleniyor) return;
    setYukleniyor(true);
    try {
      const res = await fetch("/api/duvar-yorum", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fotoId: secili, yorum: yeni.trim() }),
      });
      if (res.ok) {
        setYeni("");
        const r2 = await fetch(`/api/duvar-yorumlar?fotoId=${secili}`);
        const v = await r2.json();
        setYorumlar(v.yorumlar ?? []);
        setDurum((d) => ({
          ...d,
          [secili]: { ...d[secili], yorumSayi: v.yorumlar?.length ?? d[secili].yorumSayi },
        }));
      }
    } catch {
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {fotolar.map(
          (f) =>
            f.url && (
              <button
                key={f.id}
                onClick={() => ac(f.id)}
                className="relative overflow-hidden rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-xs text-white">
                  <span>
                    {durum[f.id]?.begendim ? "❤️" : "🤍"} {durum[f.id]?.begeniSayi ?? 0}
                  </span>
                  <span>💬 {durum[f.id]?.yorumSayi ?? 0}</span>
                </span>
              </button>
            )
        )}
      </div>

      {sec &&
        sec.url &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur">
            <button
              onClick={() => setSecili(null)}
              className="self-end p-4 text-2xl text-slate-300"
              aria-label="Kapat"
            >
              ✕
            </button>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sec.url}
                alt=""
                className="mx-auto max-h-[45vh] w-auto rounded-2xl object-contain"
              />
              {sec.caption && (
                <p className="mt-2 text-center text-sm text-slate-300">{sec.caption}</p>
              )}
              <div className="mt-3 flex items-center justify-center">
                <button
                  onClick={() => begen(sec.id)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-base"
                >
                  {durum[sec.id]?.begendim ? "❤️" : "🤍"} {durum[sec.id]?.begeniSayi ?? 0}
                </button>
              </div>
              <div className="mx-auto mt-4 max-w-md space-y-3">
                {yorumlar === null ? (
                  <p className="text-center text-sm text-slate-500">…</p>
                ) : yorumlar.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">{t.yorumYok}</p>
                ) : (
                  yorumlar.map((y) => (
                    <div key={y.id} className="flex items-start gap-2">
                      <Avatar ad={y.ad} url={y.avatar} boyut="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gold-light">{y.ad}</p>
                        <p className="text-sm text-slate-200">{y.yorum}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 bg-midnight/95 p-3">
              <input
                value={yeni}
                onChange={(e) => setYeni(e.target.value)}
                maxLength={280}
                placeholder={t.yorumYer}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    yorumGonder();
                  }
                }}
                className="flex-1 rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
              />
              <button
                onClick={yorumGonder}
                disabled={yukleniyor || !yeni.trim()}
                className="btn-kor rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {t.yorumGonder}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
