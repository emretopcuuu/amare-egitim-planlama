"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.profilFoto;
const V = 256; // kırpma görüntü alanı (kare, px)
const CIKIS = 512; // yüklenen kare boyut

// Kamp öncesi profil fotoğrafı: kişi fotoğrafı doğrudan koymaz — daire içinde
// sürükleyip yakınlaştırarak yüzünü ortalar, sonra kare kırpılıp yüklenir.
export default function ProfilFoto({ varMi = false }: { varMi?: boolean }) {
  const router = useRouter();
  const girisRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const surukle = useRef<{ x: number; y: number } | null>(null);

  const [kaynak, setKaynak] = useState<string | null>(null);
  const [dogal, setDogal] = useState<{ w: number; h: number } | null>(null);
  const [z, setZ] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(varMi);

  // z yakınlaştırmasında görüntü boyutu
  function boyut(zoom: number, d: { w: number; h: number }) {
    const kapla = Math.max(V / d.w, V / d.h); // alanı tam kaplayan taban ölçek
    const ds = kapla * zoom;
    return { dw: d.w * ds, dh: d.h * ds };
  }
  function kistir(p: { x: number; y: number }, zoom: number, d: { w: number; h: number }) {
    const { dw, dh } = boyut(zoom, d);
    return {
      x: Math.min(0, Math.max(V - dw, p.x)),
      y: Math.min(0, Math.max(V - dh, p.y)),
    };
  }

  function secildi(f: File | null) {
    setHata(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setHata(t.hata);
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const d = { w: img.naturalWidth, h: img.naturalHeight };
      setDogal(d);
      setZ(1);
      const { dw, dh } = boyut(1, d);
      setPos({ x: (V - dw) / 2, y: (V - dh) / 2 }); // ortala
      setKaynak(url);
    };
    img.onerror = () => setHata(t.hata);
    img.src = url;
  }

  function zoomDegis(yeni: number) {
    if (!dogal) return;
    // Merkezi koruyarak yakınlaştır
    const { dw: edw, dh: edh } = boyut(z, dogal);
    const cx = (V / 2 - pos.x) / edw;
    const cy = (V / 2 - pos.y) / edh;
    const { dw, dh } = boyut(yeni, dogal);
    setZ(yeni);
    setPos(kistir({ x: V / 2 - cx * dw, y: V / 2 - cy * dh }, yeni, dogal));
  }

  function basla(e: React.PointerEvent) {
    surukle.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function hareket(e: React.PointerEvent) {
    if (!surukle.current || !dogal) return;
    const dx = e.clientX - surukle.current.x;
    const dy = e.clientY - surukle.current.y;
    surukle.current = { x: e.clientX, y: e.clientY };
    setPos((p) => kistir({ x: p.x + dx, y: p.y + dy }, z, dogal));
  }
  function bitir(e: React.PointerEvent) {
    surukle.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  function vazgec() {
    if (kaynak) URL.revokeObjectURL(kaynak);
    setKaynak(null);
    setDogal(null);
    imgRef.current = null;
  }

  async function kaydet() {
    if (!imgRef.current || !dogal || mesgul) return;
    setMesgul(true);
    setHata(null);
    try {
      const c = document.createElement("canvas");
      c.width = CIKIS;
      c.height = CIKIS;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error();
      const k = CIKIS / V;
      const { dw, dh } = boyut(z, dogal);
      ctx.drawImage(imgRef.current, pos.x * k, pos.y * k, dw * k, dh * k);
      const blob = await new Promise<Blob | null>((res) =>
        c.toBlob(res, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error();
      const form = new FormData();
      form.append("foto", blob, "profil.jpg");
      const res = await fetch("/api/profil-foto", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      if (kaynak) URL.revokeObjectURL(kaynak);
      setKaynak(null);
      setBitti(true);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  if (bitti && !kaynak) {
    return (
      <button
        onClick={() => {
          setBitti(false);
          girisRef.current?.click();
        }}
        className="text-sm text-emerald-400 underline-offset-4 hover:underline"
      >
        {t.degistir}
      </button>
    );
  }

  const olcu = dogal ? boyut(z, dogal) : { dw: V, dh: V };

  return (
    <div className="space-y-3">
      <input
        ref={girisRef}
        type="file"
        accept="image/*"
        onChange={(e) => secildi(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {kaynak && dogal ? (
        <div className="space-y-3">
          <p className="text-center text-xs text-slate-400">{t.kirpIpucu}</p>
          {/* Kırpma alanı: sürükle + yakınlaştır, daire yüzü ortalar */}
          <div
            onPointerDown={basla}
            onPointerMove={hareket}
            onPointerUp={bitir}
            onPointerCancel={bitir}
            className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-black"
            style={{ width: V, height: V, maxWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={kaynak}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: pos.x, top: pos.y, width: olcu.dw, height: olcu.dh }}
            />
            {/* Daire maskesi (dışı karartılır) + altın halka */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(2,8,15,0.55)] ring-2 ring-gold/60" />
          </div>

          <div className="flex items-center gap-2">
            <span aria-hidden>🔍</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={z}
              onChange={(e) => zoomDegis(Number(e.target.value))}
              aria-label={t.yakinlastir}
              className="h-2 flex-1 accent-gold"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={kaydet}
              disabled={mesgul}
              className="btn-kor flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold disabled:opacity-50"
            >
              {mesgul ? t.yukleniyor : t.kaydet}
            </button>
            <button
              onClick={vazgec}
              className="h-11 rounded-xl px-3 text-sm text-slate-400 hover:text-slate-200"
            >
              {t.vazgec}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => girisRef.current?.click()}
          className="btn-kor flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold"
        >
          {t.sec}
        </button>
      )}
      {hata && <p className="text-sm text-red-400">{hata}</p>}
    </div>
  );
}
