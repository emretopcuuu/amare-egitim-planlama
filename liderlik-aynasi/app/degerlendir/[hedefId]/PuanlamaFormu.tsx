"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret, suDalgasi } from "@/lib/his";

type Ozellik = { id: number; name: string; observation_hint: string };
type Girdi = { puan: number | null; yorum: string };
type Props = {
  dalgaId: number;
  dalgaAdi: string;
  hedefId: string;
  hedefAd: string;
  hedefTakim: string | null;
  kendisi: boolean;
  ozellikler: Ozellik[];
  mevcut: { ozellikId: number; puan: number; yorum: string }[];
};

const YORUM_MAX = 500;
// Gizlilik güvencesini ilk kez başkasını puanlarken bir kez göster (cihazda işaretli).
const GIZLILIK_ACK = "la_gizlilik_ack_v1";

// Kamp wifi'ı güvenilmez: her değişiklik localStorage'a taslak yazılır,
// başarılı gönderimde silinir. Taslak, sunucudaki kayıtlı puanlardan
// daha yenidir (gönderilmemiş düzenleme), bu yüzden önceliklidir.
function taslakAnahtari(dalgaId: number, hedefId: string) {
  return `la_taslak_v1:${dalgaId}:${hedefId}`;
}

// SİHİRBAZ: her ekranda TEK özellik, dev puan butonları, otomatik ilerleme.
// UX ilkesi: az yazı, büyük yazı, o an yapılan iş dışında hiçbir şey yok.
export default function PuanlamaFormu({
  dalgaId,
  dalgaAdi,
  hedefId,
  hedefAd,
  hedefTakim,
  kendisi,
  ozellikler,
  mevcut,
}: Props) {
  const router = useRouter();

  const [girdiler, setGirdiler] = useState<Record<number, Girdi>>(() => {
    const ilk: Record<number, Girdi> = {};
    for (const o of ozellikler) ilk[o.id] = { puan: null, yorum: "" };
    for (const m of mevcut) ilk[m.ozellikId] = { puan: m.puan, yorum: m.yorum };
    return ilk;
  });
  // kaldığın yerden devam: ilk puansız özellikten başla
  const [adim, setAdim] = useState(() => {
    const dolu = new Set(mevcut.map((m) => m.ozellikId));
    const i = ozellikler.findIndex((o) => !dolu.has(o.id));
    return i === -1 ? ozellikler.length : i;
  });
  // İlk kez kendini puanlayan için programı anlatan giriş ekranı (tek seferlik).
  const [giris, setGiris] = useState(kendisi && mevcut.length === 0);
  // İlk kez BİRİNİ puanlayan için gizlilik güvencesi (mount'ta localStorage'a bakılır).
  const [gizlilik, setGizlilik] = useState(false);
  // İlk öz puanlamadan sonra kutlama/bilgilendirme ekranına gidilir (mount'ta sabit)
  const ilkOzPuan = useRef(kendisi && mevcut.length === 0);
  const [taslakGeldi, setTaslakGeldi] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yorumUyari, setYorumUyari] = useState(false);
  const yuklendi = useRef(false);
  const ilerleZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ilerleZamanlayici.current) clearTimeout(ilerleZamanlayici.current);
    };
  }, []);

  // Taslağı yalnızca ilk yüklemede geri al (hydration sonrası, SSR uyumsuzluğu olmasın).
  useEffect(() => {
    if (yuklendi.current) return;
    yuklendi.current = true;
    // İlk kez birini puanlıyorsa ve daha önce güvence görmediyse göster.
    try {
      if (!kendisi && mevcut.length === 0 && !localStorage.getItem(GIZLILIK_ACK)) {
        // localStorage yalnızca istemcide okunur; mount'ta tek seferlik karar.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGizlilik(true);
      }
    } catch {
      // depolama kapalı: güvenceyi atla
    }
    try {
      const ham = localStorage.getItem(taslakAnahtari(dalgaId, hedefId));
      if (!ham) return;
      const taslak = JSON.parse(ham) as Record<number, Girdi>;
      const temel: Record<number, Girdi> = {};
      for (const o of ozellikler) temel[o.id] = { puan: null, yorum: "" };
      for (const m of mevcut) temel[m.ozellikId] = { puan: m.puan, yorum: m.yorum };
      for (const o of ozellikler) {
        const t = taslak[o.id];
        if (t && (t.puan !== null || t.yorum)) temel[o.id] = t;
      }
      // localStorage SSR'da okunamaz; taslak ancak hydration sonrası tek seferlik
      // geri yüklenebilir. Bilinçli istisna — kascading render yok.
      setGirdiler(temel);
      setTaslakGeldi(true);
      const i = ozellikler.findIndex((o) => temel[o.id].puan === null);
      setAdim(i === -1 ? ozellikler.length : i);
    } catch {
      // bozuk taslak yok sayılır
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function guncelle(ozellikId: number, degisim: Partial<Girdi>) {
    setHata(null);
    setGirdiler((eski) => {
      const yeni = { ...eski, [ozellikId]: { ...eski[ozellikId], ...degisim } };
      try {
        localStorage.setItem(taslakAnahtari(dalgaId, hedefId), JSON.stringify(yeni));
      } catch {
        // depolama dolu/kapalı: taslaksız devam
      }
      return yeni;
    });
  }

  function ileri() {
    setYorumUyari(false);
    setAdim((a) => Math.min(a + 1, ozellikler.length));
  }

  function geri() {
    setYorumUyari(false);
    setAdim((a) => Math.max(a - 1, 0));
  }

  function puanSec(o: Ozellik, p: number) {
    titret(10);
    guncelle(o.id, { puan: p });
    setYorumUyari(false);
    const yorumGerekli = !kendisi && p < 6;
    if (!yorumGerekli) {
      // seçim hissedilsin, sonra kendiliğinden sıradaki özelliğe geç
      if (ilerleZamanlayici.current) clearTimeout(ilerleZamanlayici.current);
      ilerleZamanlayici.current = setTimeout(ileri, 300);
    }
  }

  const puansizlar = ozellikler.filter((o) => girdiler[o.id].puan === null);
  const eksikYorumlar = kendisi
    ? []
    : ozellikler.filter((o) => {
        const g = girdiler[o.id];
        return g.puan !== null && g.puan < 6 && !g.yorum.trim();
      });

  async function gonder() {
    if (gonderiliyor) return;
    // eksik varsa pasif buton yerine doğrudan o ekrana götür
    if (puansizlar.length > 0) {
      setAdim(ozellikler.findIndex((o) => o.id === puansizlar[0].id));
      return;
    }
    if (eksikYorumlar.length > 0) {
      setYorumUyari(true);
      setAdim(ozellikler.findIndex((o) => o.id === eksikYorumlar[0].id));
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/puanla", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hedefId,
          puanlar: ozellikler.map((o) => ({
            ozellikId: o.id,
            puan: girdiler[o.id].puan,
            yorum: girdiler[o.id].yorum.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? tr.puanlama.hataSunucu);
        return;
      }
      try {
        localStorage.removeItem(taslakAnahtari(dalgaId, hedefId));
      } catch {
        // taslak silinemezse sorun değil: sunucu kaydı esas
      }
      titret([12, 40, 12]);
      suDalgasi();
      // İlk öz puanlamadan sonra kutlama + kamp bilgilendirmesi; sonra hub
      router.push(ilkOzPuan.current ? "/hosgeldin" : "/degerlendir");
      router.refresh();
    } catch {
      // Ağ hatası: taslak zaten cihazda, kullanıcıyı bilgilendir.
      setHata(tr.puanlama.hataCevrimdisi);
    } finally {
      setGonderiliyor(false);
    }
  }

  const sonEkran = adim >= ozellikler.length;
  const o = sonEkran ? null : ozellikler[adim];
  const g = o ? girdiler[o.id] : null;
  const yorumGerekli = !!(o && g && !kendisi && g.puan !== null && g.puan < 6);
  // Öz değerlendirmede özelliğe kendine hitap eden rehber + 1/10 anlamı göster
  const rehber = o && kendisi ? tr.ozellikRehberi[o.name] : null;

  // GİRİŞ EKRANI: ilk kez kendini puanlayan kişiye programı anlat (tek seferlik)
  if (giris) {
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <p className="text-5xl">🪞</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {tr.puanlama.girisBaslik}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300">
          {tr.puanlama.girisMetin}
        </p>
        <button
          onClick={() => setGiris(false)}
          className="parilti btn-kor mx-auto mt-10 flex h-16 w-full max-w-md items-center justify-center rounded-2xl text-xl font-bold"
        >
          {tr.puanlama.girisDevam}
        </button>
      </div>
    );
  }

  // GİZLİLİK KAPISI: birini ilk kez puanlamadan önce "puanların isimsiz" güvencesi
  if (gizlilik) {
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <p className="text-6xl">🔒</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {tr.puanlama.gizlilikBaslik}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300">
          {tr.puanlama.gizlilikMetin}
        </p>
        <button
          onClick={() => {
            try {
              localStorage.setItem(GIZLILIK_ACK, "1");
            } catch {
              // depolama kapalı: yine de devam et
            }
            setGizlilik(false);
          }}
          className="parilti btn-kor mx-auto mt-10 flex h-16 w-full max-w-md items-center justify-center rounded-2xl text-xl font-bold"
        >
          {tr.puanlama.gizlilikDevam}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[82vh] flex-col">
      {/* üst çubuk: geri + kim + ilerleme */}
      <header>
        <div className="flex items-center justify-between">
          {adim === 0 ? (
            <Link
              href="/degerlendir"
              className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              ← {tr.puanlama.geriDon}
            </Link>
          ) : (
            <button
              onClick={geri}
              className="text-base text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              ← {tr.puanlama.geri}
            </button>
          )}
          <span className="font-mono text-lg font-bold text-slate-300">
            {Math.min(adim + 1, ozellikler.length)} / {ozellikler.length}
          </span>
        </div>
        <p className="prizma-serif ay-metin mt-3 truncate text-xl font-semibold">
          {kendisi ? tr.puanlama.ozBaslik : hedefAd}
          {hedefTakim && !kendisi && (
            <span className="ml-2 align-middle rounded-md bg-royal/30 px-2 py-0.5 text-xs text-royal-light">
              {hedefTakim}
            </span>
          )}
        </p>
        {!kendisi && (
          <p className="mt-1 text-xs font-medium text-emerald-300/90">
            {tr.puanlama.gizlilikRozet}
          </p>
        )}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-300"
            style={{ width: `${(Math.min(adim, ozellikler.length) / ozellikler.length) * 100}%` }}
          />
        </div>
        {taslakGeldi && adim < ozellikler.length && (
          <p className="mt-2 text-sm font-medium text-amber-400">
            {tr.puanlama.taslakGeriYuklendi}
          </p>
        )}
      </header>

      {/* TEK ÖZELLİK ekranı */}
      {o && g && (
        <div className="flex flex-1 flex-col justify-center py-8">
          <h1 className="prizma-serif ay-metin text-4xl font-semibold leading-tight">
            {o.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            {rehber ? rehber.kendine : o.observation_hint}
          </p>

          {rehber && (
            <div className="mt-4 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-base">
              <p className="text-slate-400">{tr.puanlama.olcekDusuk(rehber.dusuk)}</p>
              <p className="text-slate-200">{tr.puanlama.olcekYuksek(rehber.yuksek)}</p>
            </div>
          )}

          {kendisi && (
            <p className="mt-6 text-base font-semibold text-gold-light">
              {tr.puanlama.neredesin}
            </p>
          )}

          <div role="radiogroup" aria-label={o.name} className={`${kendisi ? "mt-3" : "mt-8"} grid grid-cols-5 gap-2.5`}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={g.puan === p}
                onClick={() => puanSec(o, p)}
                className={`h-16 rounded-2xl text-2xl font-bold transition-all ${
                  g.puan === p
                    ? "btn-kor scale-105"
                    : "border-2 border-white/20 text-slate-200 hover:border-gold/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-sm text-slate-500">
            <span>{tr.puanlama.dusukUc}</span>
            <span>{tr.puanlama.yuksekUc}</span>
          </div>

          {yorumGerekli && (
            <div className="mt-6">
              <label htmlFor="yorum" className="text-lg font-semibold text-amber-300">
                {tr.puanlama.yorumEtiket}
              </label>
              <textarea
                id="yorum"
                value={g.yorum}
                maxLength={YORUM_MAX}
                rows={3}
                onChange={(e) => guncelle(o.id, { yorum: e.target.value })}
                placeholder={tr.puanlama.yorumPlaceholder}
                className="mt-2 w-full rounded-2xl border-2 border-amber-400/40 bg-midnight-soft p-4 text-lg text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
              />
              {yorumUyari && !g.yorum.trim() && (
                <p role="alert" className="mt-1 text-base font-medium text-red-400">
                  {tr.puanlama.yorumZorunlu}
                </p>
              )}
              <button
                onClick={() => (g.yorum.trim() ? ileri() : setYorumUyari(true))}
                className="btn-kor mt-4 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
              >
                {tr.puanlama.devam} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* SON EKRAN: kontrol et ve gönder */}
      {sonEkran && (
        <div className="flex flex-1 flex-col justify-center py-8">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {tr.puanlama.ozetBaslik}
          </h1>
          <ul className="mt-6 space-y-2">
            {ozellikler.map((oz, i) => (
              <li key={oz.id}>
                <button
                  onClick={() => setAdim(i)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.08]"
                >
                  <span className="text-base text-slate-200">{oz.name}</span>
                  <span
                    className={`text-xl font-bold ${
                      girdiler[oz.id].puan === null ? "text-red-400" : "text-gold"
                    }`}
                  >
                    {girdiler[oz.id].puan ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hata && (
            <p role="alert" className="mt-4 text-center text-base font-medium text-red-400">
              {hata}
            </p>
          )}
          <button
            type="button"
            onClick={gonder}
            disabled={gonderiliyor}
            className="btn-kor parilti mt-6 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-50"
          >
            {gonderiliyor ? tr.puanlama.gonderiliyor : tr.puanlama.gonder}
          </button>
        </div>
      )}

      <p className="pb-2 text-center text-xs text-slate-500">{dalgaAdi} · {tr.puanlama.taslakNotu}</p>
    </div>
  );
}
