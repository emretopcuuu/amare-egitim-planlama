"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import GrupUyeFoto from "@/components/GrupUyeFoto";
import KonusanYansima from "@/components/KonusanYansima";

const t = tr.sahitlik;

type Kisi = {
  sahibiId: string;
  ad: string;
  telefon: string | null;
  seri: number;
  kacirilanGun: number;
  sonAdim: string | null;
  haftaGorusme: number;
  haftaKota: number | null;
  haftaKayit: number;
  fotoUrl: string | null;
  sozMetni: string | null;
  sozSesUrl: string | null;
  sozAksiyonlari: { metin: string; ufuk: string }[];
  bugunGonderildi: boolean;
  son14: { gun: string; yapildi: boolean | null }[];
};

export default function SahitlikPanel({ kisiler }: { kisiler: Kisi[] }) {
  // [Şahitlik geliştirme #5] Sunucudan gelen "bugün gönderildi" durumuyla
  // başlar — sayfa yenilense de "Gönderildi ✓" kaybolmaz, spam da önlenir.
  const [gonderilen, setGonderilen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(kisiler.filter((k) => k.bugunGonderildi).map((k) => [k.sahibiId, true]))
  );
  const [alkislanan, setAlkislanan] = useState<Record<string, boolean>>({});
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [sozAcik, setSozAcik] = useState<Record<string, boolean>>({});
  // [Şahitlik geliştirme #6] İsteğe bağlı kişisel mesaj — API zaten destekliyordu,
  // UI eksikti. Boşsa durtmeGonder kendi varsayılan metnini kullanır.
  const [mesajlar, setMesajlar] = useState<Record<string, string>>({});

  async function durt(sahibi: string, tip: string) {
    setMesgul(sahibi + tip);
    try {
      const mesaj = mesajlar[sahibi]?.trim() || undefined;
      const res = await fetch("/api/sahitlik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sahibi, tip, mesaj }),
      });
      if (!res.ok) return;
      if (tip === "alkis") setAlkislanan((g) => ({ ...g, [sahibi]: true }));
      else {
        setGonderilen((g) => ({ ...g, [sahibi]: true }));
        setMesajlar((m) => ({ ...m, [sahibi]: "" }));
      }
    } finally {
      setMesgul(null);
    }
  }

  // [Şahitlik geliştirme #7] Gruplama: "ilgin gerekiyor" (2+ gün kaçıranlar,
  // zaten kacirilanGun'a göre sıralı) önce, "yolunda" sonra — çok kişide tek
  // bakışta "bugün kimi arayacağım" netleşir.
  const ilgiGerekenler = kisiler.filter((k) => k.kacirilanGun >= 2);
  const yolundakiler = kisiler.filter((k) => k.kacirilanGun < 2);

  function Kart({ k }: { k: Kisi }) {
    const takildi = k.kacirilanGun >= 2;
    const gonder = gonderilen[k.sahibiId];
    const alkislandi = alkislanan[k.sahibiId];
    const sozGoster = sozAcik[k.sahibiId];
    return (
      <li
        className={`rounded-2xl border p-4 ${
          takildi ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-royal/30 bg-midnight-card/60"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* [Şahitlik geliştirme #1] Foto + tam ekran büyütme + WhatsApp. */}
          <GrupUyeFoto ad={k.ad} takim={null} telefon={k.telefon} fotoUrl={k.fotoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-100">{k.ad}</p>
            <p className={`text-xs ${takildi ? "text-amber-300" : "text-emerald-300"}`}>
              {takildi ? t.kacirdi(k.kacirilanGun) : t.guncel} · {t.seri(k.seri)}
            </p>
          </div>
        </div>

        {/* [Şahitlik geliştirme #3] Son 14 gün mini şerit — /takip'teki desen. */}
        <div className="mt-2 flex flex-wrap gap-1">
          {k.son14.map((g) => (
            <span
              key={g.gun}
              title={g.gun}
              className={`h-2 w-2 rounded-sm ${
                g.yapildi === true
                  ? "bg-emerald-500/80"
                  : g.yapildi === false
                    ? "bg-red-500/40"
                    : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* [Şahitlik geliştirme #2] Sözünü dinle — şahit KİME şahit olduğunu
            ve neye söz verdiğini unutmasın. */}
        {k.sozMetni && (
          <div className="mt-3">
            <button
              onClick={() => setSozAcik((s) => ({ ...s, [k.sahibiId]: !s[k.sahibiId] }))}
              className="text-xs font-medium text-royal-light underline-offset-2 hover:underline"
            >
              {sozGoster ? "▲ Sözünü gizle" : "▼ Sözünü ve adımlarını gör"}
            </button>
            {sozGoster && (
              <div className="mt-2 space-y-2 rounded-xl bg-white/[0.03] p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {k.sozMetni}
                </p>
                {k.sozSesUrl && (
                  <KonusanYansima videoUrl={null} sesUrl={k.sozSesUrl} etiket="Sözünü dinle" />
                )}
                {k.sozAksiyonlari.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {k.sozAksiyonlari.map((a, i) => (
                      <li key={i} className="text-xs text-slate-400">
                        📌 {a.metin}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* [Faz 9] Şahit Karnesi — haftalık kota gerçekleşmesi. */}
        {k.haftaKota != null && (
          <div className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2">
            <div className="flex items-center justify-between text-[0.7rem] text-slate-400">
              <span>📞 Bu hafta görüşme</span>
              <span className="font-semibold text-slate-200">
                {k.haftaGorusme} / {k.haftaKota}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{
                  width: `${Math.min(100, Math.round((k.haftaGorusme / k.haftaKota) * 100))}%`,
                }}
              />
            </div>
            {/* [Şahitlik geliştirme #4] Kayıt rozeti — kutlanacak anı şahit görsün. */}
            {k.haftaKayit > 0 && (
              <p className="mt-1.5 text-[0.7rem] font-semibold text-gold-light">
                🔔 Bu hafta {k.haftaKayit} kayıt
              </p>
            )}
          </div>
        )}

        {!gonder && (
          <input
            value={mesajlar[k.sahibiId] ?? ""}
            onChange={(e) => setMesajlar((m) => ({ ...m, [k.sahibiId]: e.target.value.slice(0, 300) }))}
            placeholder="İsteğe bağlı kişisel mesaj…"
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-gold/40"
          />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {gonder ? (
            <span className="text-sm font-medium text-emerald-300">{t.gonderildi}</span>
          ) : (
            <>
              <button
                onClick={() => durt(k.sahibiId, "hatirlatma")}
                disabled={mesgul !== null}
                className="rounded-lg bg-midnight-soft px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-royal/30 disabled:opacity-50"
              >
                {t.durt}
              </button>
              <button
                onClick={() => durt(k.sahibiId, "tesvik")}
                disabled={mesgul !== null}
                className="rounded-lg bg-gold/15 px-3 py-1.5 text-sm font-medium text-gold-light hover:bg-gold/25 disabled:opacity-50"
              >
                {t.tesvik}
              </button>
            </>
          )}
          {/* [Faz 10] Şahit Alkışı — dürtme değil, tek dokunuşluk takdir. */}
          {alkislandi ? (
            <span className="text-sm font-medium text-gold-light">👏 Alkışlandı</span>
          ) : (
            <button
              onClick={() => durt(k.sahibiId, "alkis")}
              disabled={mesgul !== null}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              👏 Alkışla
            </button>
          )}
          {k.telefon && (
            <a
              href={`tel:${k.telefon}`}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
            >
              {t.ara}
            </a>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <header className="text-center">
        <p className="text-4xl">🤝</p>
        <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.aciklama}</p>
      </header>

      {kisiler.length === 0 ? (
        <p className="rounded-2xl bg-midnight-soft/60 p-6 text-center text-sm text-slate-400">{t.bos}</p>
      ) : (
        <>
          {ilgiGerekenler.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                🔴 İlgin gerekiyor
              </h2>
              <ul className="space-y-3">
                {ilgiGerekenler.map((k) => (
                  <Kart key={k.sahibiId} k={k} />
                ))}
              </ul>
            </section>
          )}
          {yolundakiler.length > 0 && (
            <section className="space-y-3">
              {ilgiGerekenler.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  🟢 Yolunda
                </h2>
              )}
              <ul className="space-y-3">
                {yolundakiler.map((k) => (
                  <Kart key={k.sahibiId} k={k} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          {t.anaSayfa}
        </Link>
      </p>
    </div>
  );
}
