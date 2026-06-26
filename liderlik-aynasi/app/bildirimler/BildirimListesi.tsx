"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Geliştirme 1 — Bildirim Merkezi: SW push'larını localStorage'dan okur.
// Service worker bildirimi aldığında "la_bildirim_log" anahtarına yazar.
// Bu sayfa okuyup tarih sıralamasıyla listeler. DB gerektirmez, offline çalışır.

const LOG_ANAHTAR = "la_bildirim_log";
const MAKS_KAYIT = 50;

type BildirimKaydi = {
  id: string;
  baslik: string;
  govde: string;
  url: string;
  zaman: number; // epoch ms
  okundu: boolean;
};

function zamanMetni(ms: number): string {
  const fark = Date.now() - ms;
  if (fark < 60_000) return "az önce";
  if (fark < 3_600_000) return `${Math.floor(fark / 60_000)} dk önce`;
  if (fark < 86_400_000) return `${Math.floor(fark / 3_600_000)} sa önce`;
  return new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function kaydet(baslik: string, govde: string, url: string): void {
  try {
    const ham = localStorage.getItem(LOG_ANAHTAR);
    const mevcut: BildirimKaydi[] = ham ? JSON.parse(ham) : [];
    const yeni: BildirimKaydi = {
      id: crypto.randomUUID(),
      baslik,
      govde,
      url,
      zaman: Date.now(),
      okundu: false,
    };
    const guncellenmis = [yeni, ...mevcut].slice(0, MAKS_KAYIT);
    localStorage.setItem(LOG_ANAHTAR, JSON.stringify(guncellenmis));
  } catch {}
}

export default function BildirimListesi() {
  const [kayitlar, setKayitlar] = useState<BildirimKaydi[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    try {
      const ham = localStorage.getItem(LOG_ANAHTAR);
      if (ham) setKayitlar(JSON.parse(ham));
    } catch {}
    setYuklendi(true);
  }, []);

  function tumunuOku() {
    const guncellenmis = kayitlar.map((k) => ({ ...k, okundu: true }));
    setKayitlar(guncellenmis);
    try {
      localStorage.setItem(LOG_ANAHTAR, JSON.stringify(guncellenmis));
    } catch {}
  }

  function temizle() {
    setKayitlar([]);
    try {
      localStorage.removeItem(LOG_ANAHTAR);
    } catch {}
  }

  if (!yuklendi) return null;

  const okunmamis = kayitlar.filter((k) => !k.okundu).length;

  if (kayitlar.length === 0) {
    return (
      <div className="rounded-2xl border border-royal/20 bg-midnight-card/40 px-6 py-10 text-center">
        <p className="text-3xl" aria-hidden>🔕</p>
        <p className="mt-2 text-sm text-slate-400">Henüz bildirim yok.</p>
        <p className="mt-1 text-xs text-slate-500">
          Telefonuna AYNA'yı kurarsan görevler ve hatırlatmalar burada görünür.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Üst araç çubuğu */}
      {(okunmamis > 0 || kayitlar.length > 0) && (
        <div className="flex items-center justify-between text-xs">
          {okunmamis > 0 && (
            <button onClick={tumunuOku} className="text-gold-light underline hover:text-gold">
              Tümünü okundu işaretle ({okunmamis})
            </button>
          )}
          <button
            onClick={temizle}
            className="ml-auto text-slate-500 underline hover:text-slate-300"
          >
            Temizle
          </button>
        </div>
      )}

      {/* Bildirim listesi */}
      <ul className="space-y-2">
        {kayitlar.map((k) => (
          <li key={k.id}>
            <Link
              href={k.url || "/"}
              className={`block rounded-xl border px-4 py-3 transition-colors hover:border-gold/40 ${
                k.okundu
                  ? "border-royal/15 bg-midnight-card/30"
                  : "border-royal/40 bg-midnight-card/70"
              }`}
            >
              <div className="flex items-start gap-3">
                {!k.okundu && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                    aria-label="Okunmadı"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold ${
                      k.okundu ? "text-slate-400" : "text-slate-100"
                    }`}
                  >
                    {k.baslik}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{k.govde}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{zamanMetni(k.zaman)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
