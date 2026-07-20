"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";
import TakdirMedya from "./TakdirMedya";
import { TAKDIR_MUHURLERI } from "@/lib/takdirMuhur";

const t = tr.takdir;

type Kisi = { id: string; ad: string; takim: string | null };

export default function TakdirGonder({ kisiler }: { kisiler: Kisi[] }) {
  const router = useRouter();
  const [hedef, setHedef] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [muhur, setMuhur] = useState<string | null>(null);
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [sesPath, setSesPath] = useState<string | null>(null);
  const [medyaAnahtar, setMedyaAnahtar] = useState(0); // gönderimden sonra medya bileşenini sıfırla
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gitti, setGitti] = useState(false);
  const [hata, setHata] = useState(false);

  const gonderilebilir = !!hedef && (mesaj.trim().length >= 2 || !!fotoPath || !!sesPath);

  async function gonder() {
    if (gonderiliyor || !gonderilebilir) return;
    // OPTİMİSTİK UI: gönderim biter bitmez kullanıcıya "gitti" hissini hemen ver
    // (kamp wifi'ı yavaş — bekleme hissi olmasın). Dokunsal + işitsel onay eşlik
    // eder. Sunucu hata dönerse mesajı geri yükleyip uyarı göster.
    const yedek = { hedef, mesaj, muhur, fotoPath, sesPath };
    titret([12, 30, 12]);
    cal("kazanim");
    setHata(false);
    setGonderiliyor(true);
    setMesaj("");
    setHedef("");
    setMuhur(null);
    setFotoPath(null);
    setSesPath(null);
    setMedyaAnahtar((k) => k + 1);
    setGitti(true);
    setTimeout(() => setGitti(false), 4000);
    try {
      const res = await fetch("/api/takdir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hedefId: yedek.hedef,
          mesaj: yedek.mesaj.trim(),
          muhur: yedek.muhur,
          fotoPath: yedek.fotoPath,
          sesPath: yedek.sesPath,
        }),
      });
      if (!res.ok) {
        setGitti(false);
        setHedef(yedek.hedef);
        setMesaj(yedek.mesaj);
        setMuhur(yedek.muhur);
        setFotoPath(yedek.fotoPath);
        setSesPath(yedek.sesPath);
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setGitti(false);
      setHedef(yedek.hedef);
      setMesaj(yedek.mesaj);
      setMuhur(yedek.muhur);
      setFotoPath(yedek.fotoPath);
      setSesPath(yedek.sesPath);
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="kart-cam rounded-3xl p-5">
      <h2 className="font-semibold text-gold-light">{t.gonderBaslik}</h2>
      <p className="mt-2 rounded-xl bg-gold/[0.08] px-3 py-2 text-[0.8rem] leading-relaxed text-slate-300">
        {t.gonderNot}
      </p>

      <label className="mt-3 block text-sm font-medium text-slate-300">
        {t.kimEtiket}
      </label>
      <select
        value={hedef}
        onChange={(e) => setHedef(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none focus:border-gold"
      >
        <option value="">{t.kimSec}</option>
        {kisiler.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ad}
            {k.takim ? ` · ${k.takim}` : ""}
          </option>
        ))}
      </select>

      <textarea
        value={mesaj}
        onChange={(e) => setMesaj(e.target.value.slice(0, 280))}
        rows={3}
        placeholder={t.mesajYer}
        className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
      />
      <div className="mt-2">
        <MikrofonButonu
          onMetin={(p) => setMesaj((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 280))}
        />
      </div>

      {/* A9 + A3 — foto / sesli takdir (opsiyonel) */}
      <TakdirMedya
        key={medyaAnahtar}
        onDegis={(m) => {
          setFotoPath(m.fotoPath);
          setSesPath(m.sesPath);
        }}
      />

      {/* A2 — "çünkü" ipucu: çok kısa ya da gerekçesiz takdirde nazikçe bir cümle
          daha iste (niteliği büyütür). Engellemez; sadece görünür bir davet. */}
      {mesaj.trim().length > 0 &&
        mesaj.trim().length < 40 &&
        !/çünkü|cunku|için|icin|sayende|olduğun|oldugun/i.test(mesaj) && (
          <p className="mt-2 rounded-xl bg-gold/[0.06] px-3 py-2 text-[0.78rem] leading-relaxed text-gold-light/90">
            {t.cunkuIpucu}
          </p>
        )}

      {/* A5 — Mühür (kategori) seçimi: opsiyonel. Seçilirse takdir o mührü taşır
          ve alan kişinin profilinde birikir ("en çok neyde görülüyorum"). */}
      <div className="mt-3">
        <p className="text-sm font-medium text-slate-300">{t.muhurEtiket}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TAKDIR_MUHURLERI.map((m) => {
            const secili = muhur === m.kod;
            return (
              <button
                key={m.kod}
                type="button"
                onClick={() => setMuhur(secili ? null : m.kod)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  secili
                    ? "border-gold bg-gold/20 text-gold-light"
                    : "border-royal-light/30 bg-midnight-soft text-slate-300 hover:border-gold/50"
                }`}
              >
                {m.emoji} {m.ad}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={gonder}
        disabled={gonderiliyor || !gonderilebilir}
        className="mt-3 w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
      >
        {gonderiliyor ? t.gonderiliyor : t.gonder}
      </button>
      {gitti && (
        <p className="mt-2 text-center text-sm font-semibold text-emerald-300">{t.gitti}</p>
      )}
      {hata && (
        <p className="mt-2 text-center text-sm font-medium text-red-400">{t.hata}</p>
      )}
    </section>
  );
}
