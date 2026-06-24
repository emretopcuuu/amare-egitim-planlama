"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Satir = { kod: string; ad: string; riza: boolean; durum: string };

const DURUM_ETIKET: Record<string, { yazi: string; renk: string }> = {
  hazir: { yazi: "Hazır", renk: "bg-emerald-500/15 text-emerald-300" },
  bekliyor: { yazi: "Sırada", renk: "bg-amber-500/15 text-amber-300" },
  uretiliyor: { yazi: "Üretiliyor", renk: "bg-amber-500/15 text-amber-300" },
  ses_uretiliyor: { yazi: "Ses üretiliyor", renk: "bg-amber-500/15 text-amber-300" },
  hata: { yazi: "Hata", renk: "bg-rose-500/15 text-rose-300" },
  yok: { yazi: "Yok", renk: "bg-slate-600/20 text-slate-400" },
};

export default function YansimaYukleyici({ liste }: { liste: Satir[] }) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [yuklenen, setYuklenen] = useState<string | null>(null);

  async function yukle(kod: string, dosya: File) {
    setYuklenen(kod);
    setMesaj(null);
    try {
      const form = new FormData();
      form.append("kod", kod);
      form.append("video", dosya);
      const res = await fetch("/api/admin/yansima-yukle", {
        method: "POST",
        body: form,
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setMesaj(`${kod}: ${veri?.hata ?? "Yüklenemedi."}`);
      } else {
        setMesaj(`${kod}: video bağlandı ✓`);
        router.refresh();
      }
    } catch {
      setMesaj(`${kod}: ağ hatası.`);
    } finally {
      setYuklenen(null);
    }
  }

  return (
    <div className="space-y-3">
      {mesaj && (
        <p
          role="status"
          className="rounded-xl bg-midnight-card/80 px-4 py-2 text-sm text-slate-200 ring-1 ring-royal/30"
        >
          {mesaj}
        </p>
      )}

      <ul className="space-y-2">
        {liste.map((s) => (
          <SatirKart
            key={s.kod}
            satir={s}
            yukleniyor={yuklenen === s.kod}
            onSec={(dosya) => yukle(s.kod, dosya)}
          />
        ))}
      </ul>
    </div>
  );
}

function SatirKart({
  satir,
  yukleniyor,
  onSec,
}: {
  satir: Satir;
  yukleniyor: boolean;
  onSec: (dosya: File) => void;
}) {
  const girdi = useRef<HTMLInputElement | null>(null);
  const et = DURUM_ETIKET[satir.durum] ?? DURUM_ETIKET.yok;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">{satir.ad}</p>
        <p className="text-xs text-slate-500">Kod: {satir.kod}</p>
      </div>

      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${et.renk}`}>
        {et.yazi}
      </span>

      {satir.riza ? (
        <>
          <input
            ref={girdi}
            type="file"
            accept="video/mp4,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSec(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={yukleniyor}
            onClick={() => girdi.current?.click()}
            className="shrink-0 rounded-xl bg-gold/90 px-3 py-2 text-sm font-semibold text-midnight transition hover:bg-gold disabled:opacity-50"
          >
            {yukleniyor ? "Yükleniyor…" : satir.durum === "hazir" ? "Değiştir" : "Video yükle"}
          </button>
        </>
      ) : (
        <span className="shrink-0 text-xs text-slate-500">rıza yok</span>
      )}
    </li>
  );
}
