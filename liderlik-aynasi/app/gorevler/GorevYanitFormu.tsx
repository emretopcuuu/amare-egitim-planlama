"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret, suDalgasi } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";
import Konfeti from "@/components/Konfeti";

const t = tr.gorevler;

// Kamp wifi'ı güvenilmez (captive portal): gönderilemeyen yanıt cihazda
// saklanır, internet gelince (online olayı) otomatik gönderilir.
function kuyrukAnahtari(gorevId: string) {
  return `la_gorev_yanit_v1:${gorevId}`;
}

type Sonuc = {
  puan?: number;
  yorum?: string;
  kivilcim?: number;
  toplam?: number;
  unvan?: string;
  soz?: boolean;
  senkron?: boolean;
  bekliyor?: boolean;
};

// Görev yanıtı: gönderim AYNA'nın anlık puanını bekler (5-15 sn) —
// "canlı yapay zekâ" hissinin kalbi bu bekleyiştir.
export default function GorevYanitFormu({
  gorevId,
  gorevBaslik,
}: {
  gorevId: string;
  gorevBaslik?: string;
}) {
  const router = useRouter();
  const [yanit, setYanit] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [hata, setHata] = useState(false);
  // Bağlantı yokken yanıt cihazda kuyrukta bekliyor
  const [cevrimdisi, setCevrimdisi] = useState(false);
  const gonderiliyorRef = useRef(false);

  // Sunucuya gönder; ağ hatasında yanıtı cihazda sakla (kaybetme).
  const sunucuyaGonder = useCallback(
    async (metin: string) => {
      if (gonderiliyorRef.current) return;
      gonderiliyorRef.current = true;
      setGonderiliyor(true);
      setHata(false);
      try {
        const res = await fetch("/api/gorev-yanit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ gorevId, yanit: metin }),
        });
        const veri = await res.json().catch(() => null);
        if (res.status === 202) {
          try {
            localStorage.removeItem(kuyrukAnahtari(gorevId));
          } catch {}
          setCevrimdisi(false);
          setSonuc({ bekliyor: true });
          return;
        }
        if (!res.ok) {
          setHata(true);
          return;
        }
        try {
          localStorage.removeItem(kuyrukAnahtari(gorevId));
        } catch {}
        setCevrimdisi(false);
        const buyuk = (veri?.puan ?? 0) >= 8 || !!veri?.soz;
        titret(buyuk ? [15, 40, 15, 40, 30] : [12, 40, 12]);
        suDalgasi();
        setSonuc(veri);
      } catch {
        // Ağ hatası: yanıtı cihazda sakla, bağlantı gelince otomatik gider
        try {
          localStorage.setItem(kuyrukAnahtari(gorevId), JSON.stringify({ yanit: metin }));
        } catch {}
        setCevrimdisi(true);
      } finally {
        gonderiliyorRef.current = false;
        setGonderiliyor(false);
      }
    },
    [gorevId]
  );

  // Mount'ta bekleyen yanıt varsa geri yükle ve göndermeyi dene; ayrıca
  // "online" olayında otomatik dene.
  useEffect(() => {
    let bekleyen: string | null = null;
    try {
      const ham = localStorage.getItem(kuyrukAnahtari(gorevId));
      if (ham) bekleyen = (JSON.parse(ham) as { yanit: string }).yanit;
    } catch {}
    if (bekleyen) {
      // localStorage yalnızca istemcide okunur; mount'ta tek seferlik geri yükleme.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setYanit(bekleyen);
      setCevrimdisi(true);
      void sunucuyaGonder(bekleyen);
    }
    function tekrarDene() {
      try {
        const ham = localStorage.getItem(kuyrukAnahtari(gorevId));
        if (ham) void sunucuyaGonder((JSON.parse(ham) as { yanit: string }).yanit);
      } catch {}
    }
    window.addEventListener("online", tekrarDene);
    return () => window.removeEventListener("online", tekrarDene);
  }, [gorevId, sunucuyaGonder]);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (gonderiliyor || yanit.trim().length < 2) return;
    await sunucuyaGonder(yanit);
  }

  if (cevrimdisi && !sonuc) {
    return (
      <div className="mt-4 rounded-xl border border-amber-400/30 bg-midnight-soft p-4 text-center">
        <p className="text-sm font-medium leading-relaxed text-amber-300">
          {t.cevrimdisiBekliyor}
        </p>
        <button
          onClick={() => void sunucuyaGonder(yanit)}
          disabled={gonderiliyor}
          className="mt-3 text-sm text-royal-light underline-offset-4 hover:underline disabled:opacity-50"
        >
          {gonderiliyor ? t.gonderiliyor : t.cevrimdisiTekrar}
        </button>
      </div>
    );
  }

  if (sonuc) {
    const buyukKazanim = !sonuc.bekliyor && ((sonuc.puan ?? 0) >= 8 || !!sonuc.soz);
    return (
      <>
        {buyukKazanim && <Konfeti />}
        <div className="mt-4 rounded-xl bg-midnight-soft p-4 text-center">
        {sonuc.bekliyor ? (
          <p className="text-sm text-slate-300">{t.durumlar.submitted}…</p>
        ) : (
          <>
            {sonuc.puan !== undefined && (
              <p className="text-2xl font-bold text-gold">{t.puanin(sonuc.puan)}</p>
            )}
            {sonuc.kivilcim !== undefined && (
              <p className="mt-1 font-semibold text-gold-light">
                {t.kivilcimKazandin(sonuc.kivilcim)}
              </p>
            )}
            {sonuc.yorum && (
              <p className="mt-3 text-sm italic text-slate-200">“{sonuc.yorum}”</p>
            )}
            {sonuc.toplam !== undefined && sonuc.unvan && (
              <p className="mt-3 text-xs text-slate-400">
                {tr.kivilcim.toplam(sonuc.toplam)} · {tr.kivilcim.unvanin}:{" "}
                {sonuc.unvan}
              </p>
            )}
          </>
        )}
        {/* #1 Yansıma Kapanışı: görülen içgörü — foto kanıtından önce gelir */}
        {!sonuc.bekliyor && !sonuc.soz && !sonuc.senkron && (
          <YansimaKapanisi gorevId={gorevId} />
        )}
        {/* #4 Kanıt Duvarı: görevi foto kanıtıyla kapat → duvara taşı */}
        {!sonuc.bekliyor && !sonuc.soz && <KanitEkle gorevBaslik={gorevBaslik} />}
        <button
          onClick={() => router.refresh()}
          className="mt-4 text-xs text-royal-light underline-offset-4 hover:underline"
        >
          {tr.degerlendir.devamEt} →
        </button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={gonder} className="mt-4">
      <label htmlFor={`yanit-${gorevId}`} className="text-xs font-medium text-slate-300">
        {t.yanitEtiket}
      </label>
      <textarea
        id={`yanit-${gorevId}`}
        value={yanit}
        onChange={(e) => setYanit(e.target.value)}
        rows={3}
        maxLength={1500}
        disabled={gonderiliyor}
        placeholder={t.yanitPlaceholder}
        className="mt-1 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      {hata && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-400">
          {t.hata}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">{t.sesliIpucu}</p>
      <div className="mt-1 flex gap-2">
        <MikrofonButonu
          disabled={gonderiliyor}
          onMetin={(parca) =>
            setYanit((y) => (y.trim() ? `${y.trim()} ${parca}` : parca))
          }
        />
        <button
          type="submit"
          disabled={yanit.trim().length < 2 || gonderiliyor}
          className="h-11 flex-1 btn-3d rounded-xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gonderiliyor ? t.gonderiliyor : t.gonder}
        </button>
      </div>
    </form>
  );
}

// #1 Yansıma Kapanışı: görev puanlandıktan sonra tek cümlelik iç-yansıma.
// AYNA bunu okuyup kör noktayla sessiz bağ kurarak tek cümleyle ayna tutar —
// görevi "yapılan iş"ten "görülen içgörü"ye çeviren an.
function YansimaKapanisi({ gorevId }: { gorevId: string }) {
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [yansit, setYansit] = useState<string | null>(null);
  const [atlandi, setAtlandi] = useState(false);

  async function gonder() {
    if (gonderiliyor || metin.trim().length < 2) return;
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/gorev-yansima", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId, yansima: metin.trim() }),
      });
      const veri = await res.json().catch(() => null);
      if (res.ok && veri?.yansit) {
        titret([12, 40, 12]);
        setYansit(veri.yansit);
      } else {
        setYansit(t.yansimaTesekkur);
      }
    } catch {
      setYansit(t.yansimaTesekkur);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (atlandi) return null;
  if (yansit) {
    return (
      <div className="mt-4 rounded-xl border border-royal-light/25 bg-midnight/40 p-4 text-left">
        <p className="text-sm italic leading-relaxed text-gold-light">“{yansit}”</p>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-royal-light/25 bg-midnight/40 p-4 text-left">
      <p className="text-sm font-semibold text-slate-100">{t.yansimaBaslik}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.yansimaSoru}</p>
      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        rows={2}
        maxLength={800}
        disabled={gonderiliyor}
        placeholder={t.yansimaYer}
        className="mt-2 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      <div className="mt-2 flex items-center gap-2">
        <MikrofonButonu
          disabled={gonderiliyor}
          onMetin={(parca) => setMetin((y) => (y.trim() ? `${y.trim()} ${parca}` : parca))}
        />
        <button
          type="button"
          onClick={gonder}
          disabled={metin.trim().length < 2 || gonderiliyor}
          className="h-11 flex-1 btn-3d rounded-xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gonderiliyor ? t.yansimaGonderiliyor : t.yansimaGonder}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setAtlandi(true)}
        className="mt-2 text-xs text-slate-500 underline-offset-4 hover:underline"
      >
        {t.yansimaAtla}
      </button>
    </div>
  );
}

// #4 Kanıt Duvarı: tamamlanan görevi bir fotoğrafla kanıtla. Mevcut foto
// pipeline'ını (moderasyon → duvar → büyük ekran) görev-etiketli altyazıyla kullanır.
function KanitEkle({ gorevBaslik }: { gorevBaslik?: string }) {
  const [durum, setDurum] = useState<"idle" | "yukleniyor" | "bitti" | "hata">("idle");
  const dosyaRef = useRef<HTMLInputElement>(null);

  async function sec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    setDurum("yukleniyor");
    try {
      const fd = new FormData();
      fd.append("foto", dosya);
      fd.append("altYazi", gorevBaslik ? `${t.kanitAltYazi}: ${gorevBaslik}` : t.kanitAltYazi);
      const r = await fetch("/api/foto", { method: "POST", body: fd });
      setDurum(r.ok ? "bitti" : "hata");
      if (r.ok) titret([10, 30, 10]);
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "bitti") {
    return <p className="mt-3 text-xs font-medium text-emerald-400">{t.kanitGonderildi}</p>;
  }
  return (
    <div className="mt-3">
      <input
        ref={dosyaRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={sec}
      />
      <button
        type="button"
        onClick={() => dosyaRef.current?.click()}
        disabled={durum === "yukleniyor"}
        className="mx-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-gold/40 px-4 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-50"
      >
        {durum === "yukleniyor" ? t.kanitYukleniyor : `📸 ${t.kanitEkle}`}
      </button>
      {durum === "idle" && <p className="mt-1.5 text-[0.65rem] text-slate-500">{t.kanitIpucu}</p>}
      {durum === "hata" && <p className="mt-1 text-xs text-red-400">{t.hata}</p>}
    </div>
  );
}
