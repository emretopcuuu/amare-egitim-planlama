"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { ufukAyEtiket } from "@/lib/planTakvim";
import { yolculukRutbeBul } from "@/lib/yolculukRutbe";
import { haftaKocNotu } from "@/lib/haftaKoc";
import { yolGunluguSec, gununSorusuSec } from "@/lib/aynaGunluk";
import AyMektubuKarti from "@/components/AyMektubuKarti";
import Konfeti from "@/components/Konfeti";
import KonusanYansima from "@/components/KonusanYansima";
import BildirimSerit from "@/components/BildirimSerit";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.takip;

type Durum = {
  bugunYapildi: boolean | null;
  seri: number;
  toplam: number;
  son14: { gun: string; yapildi: boolean | null }[];
  kacirilanGun: number;
  sigortaBuAyKullanildi: boolean;
};
type Aksiyon = { metin: string; ufuk: string };
type Hafta = { gorusmeToplam: number; kayitToplam: number };

// [Faz 6 — 90 gün motoru #11] "BUNU SEN SÖYLEDİN" — milestone anlarında
// kişinin mühürlü sözünü (kendi sesi) dinletir. En güçlü motivasyon aracı:
// hiçbir AI metni kişinin kendi sesiyle verdiği sözle yarışamaz. sessionStorage
// ile oturum başına bir kez (aynı milestone'u art arda göstermez).
type Milestone = { anahtar: string; baslik: string; metin: string };
function milestoneBul(durum: Durum, hafta: Hafta, kota: number | null): Milestone | null {
  if (durum.seri === 7) {
    return { anahtar: "seri7", baslik: "7 gün önce bunu SEN söylemiştin", metin: "Bir hafta önce verdiğin sözü dinle — tam da bunu yaşıyorsun." };
  }
  if (durum.kacirilanGun === 1) {
    return { anahtar: `kacirma-${durum.toplam}`, baslik: "Düşmek bitmek değil", metin: "Bir gün kaçırdın, olur. Sözünü hatırla — yarın devam." };
  }
  if (durum.toplam === 30) {
    return { anahtar: "gun30", baslik: "30 gündür yürüyorsun", metin: "Kampta ne demiştin? Kendi sesini dinle." };
  }
  // [B#28] 66. gün — alışkanlık eşiği (araştırma: bir davranış ~66 günde otomatikleşir).
  if (durum.toplam === 66) {
    return {
      anahtar: "gun66",
      baslik: "66. gün — alışkanlık eşiği",
      metin: "Bilim der ki bir davranış ortalama 66 günde alışkanlığa döner. Sen tam buradasın — artık bu sen'sin. Sözünü dinle.",
    };
  }
  if (kota && hafta.gorusmeToplam >= kota) {
    return { anahtar: "kota-tamam", baslik: "Bu hafta sözünü tuttun", metin: "Kotanı doldurdun — sen bunu SEN söylemiştin." };
  }
  return null;
}

export default function TakipAkis({
  durum: durumBaslangic,
  aksiyonlar,
  tamamlananAksiyonlar,
  hafta: haftaBaslangic,
  kota,
  sozSesUrl,
  sessizSesUrl = null,
  degerDavranisi,
  ortakMomentum,
  haftanGorev = 0,
  haftanKivilcim = 0,
  haftanCheckin = 0,
  kasAd = null,
  lakap = null,
  karakterAcik = true,
  mezuniyet = null,
  mektupMilestone = 0,
}: {
  durum: Durum;
  aksiyonlar: Aksiyon[];
  tamamlananAksiyonlar: number[];
  hafta: Hafta;
  kota: number | null;
  sozSesUrl: string | null;
  sessizSesUrl?: string | null;
  degerDavranisi: string | null;
  ortakMomentum: { cevreToplam: number; buHaftaAktif: number } | null;
  // [UX] Hub başlığından taşınan ikincil bilgiler — "Yol detayları" akordeonunda.
  haftanGorev?: number;
  haftanKivilcim?: number;
  haftanCheckin?: number;
  kasAd?: string | null;
  // [D#32] AYNA lakabı — kutlamalarda arada kullanılır (varsa).
  lakap?: string | null;
  // [D#36/#34] Karakter kill switch — kapalıysa AYNA renkli içeriği gizlenir.
  karakterAcik?: boolean;
  // [G#47] 90. güne ulaşıldıysa mezuniyet verisi (yoksa null → normal ekran).
  mezuniyet?: { adimGun: number; gorusme: number; kayit: number } | null;
  // [D#33] Ulaşılan ay dönümü (30/60/90; 0 → mektup kartı yok).
  mektupMilestone?: number;
}) {
  const [durum, setDurum] = useState<Durum>(durumBaslangic);
  // [FAZ 6 · Yaşayan Plan] Tamamlanan aksiyon index'leri — checkbox ile toggle.
  const [tamamlanan, setTamamlanan] = useState<Set<number>>(() => new Set(tamamlananAksiyonlar));
  const [aksMesgul, setAksMesgul] = useState<number | null>(null);
  async function aksiyonToggle(i: number) {
    if (aksMesgul !== null) return;
    const yeni = !tamamlanan.has(i);
    setAksMesgul(i);
    setTamamlanan((s) => {
      const k = new Set(s);
      if (yeni) k.add(i);
      else k.delete(i);
      return k;
    });
    try {
      const res = await fetch("/api/soz-aksiyon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index: i, tamam: yeni }),
      });
      if (!res.ok) {
        // geri al
        setTamamlanan((s) => {
          const k = new Set(s);
          if (yeni) k.delete(i);
          else k.add(i);
          return k;
        });
      }
    } finally {
      setAksMesgul(null);
    }
  }
  const [hafta, setHafta] = useState<Hafta>(haftaBaslangic);
  const [not, setNot] = useState("");
  const [gorusme, setGorusme] = useState("");
  const [kayit, setKayit] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [now] = useState(() => new Date());
  const [ziliGoster, setZiliGoster] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  // [B#23] Geri dönüş kutlaması — 3+ gün aradan sonra bugün işaretleyene özel.
  const [geriDonus, setGeriDonus] = useState(0); // kaç gün aradan döndü (0=gösterme)

  useEffect(() => {
    if (!sozSesUrl) return;
    const m = milestoneBul(durum, hafta, kota);
    if (!m) return;
    try {
      if (sessionStorage.getItem(`milestone-${m.anahtar}`)) return;
      sessionStorage.setItem(`milestone-${m.anahtar}`, "1");
    } catch {
      // depolama kapalı: yine de göster
    }
    setMilestone(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durum.seri, durum.kacirilanGun, durum.toplam, hafta.gorusmeToplam]);

  async function checkin(yapildi: boolean) {
    setMesgul(true);
    // [B#23] Bu işaretlemeden ÖNCEKİ kaçırma — geri dönüş kutlaması için.
    const oncekiKacirma = durum.kacirilanGun;
    try {
      const kayitSayisi = Math.max(0, Math.round(Number(kayit) || 0));
      const res = await fetch("/api/soz-takip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          yapildi,
          notlar: not,
          gorusmeSayisi: gorusme.trim() ? Number(gorusme) : null,
          kayitSayisi,
        }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.durum) {
        setDurum(v.durum);
        if (v.hafta) setHafta(v.hafta);
        setNot("");
        setGorusme("");
        setKayit("");
        if (v.kayitZili) {
          setZiliGoster(true);
          setTimeout(() => setZiliGoster(false), 2600);
        } else if (yapildi && oncekiKacirma >= 3 && oncekiKacirma < 900) {
          // Kayıt zili yoksa ve uzun aradan dönüldüyse: geri dönüş kutlaması.
          setGeriDonus(oncekiKacirma);
          setTimeout(() => setGeriDonus(0), 3200);
        }
      }
    } finally {
      setMesgul(false);
    }
  }

  const isaretli = durum.bugunYapildi !== null;
  const kotaOrani = kota ? Math.min(100, Math.round((hafta.gorusmeToplam / kota) * 100)) : null;
  // [B#21] Yolculuk rütbesi — adım atılan gün sayısından (kamp unvanından ayrı).
  const rutbe = yolculukRutbeBul(durum.toplam);
  // [E#37] Haftalık koç notu — bu haftanın verisinden deterministik değerlendirme
  // + gelecek haftanın TEK odağı (AI yok). Son 7 günde kaç işaret var?
  const son7Isaret = durum.son14.slice(-7).filter((g) => g.yapildi === true).length;
  const kocNotu = haftaKocNotu({
    son7Isaret,
    seri: durum.seri,
    kacirilanGun: durum.kacirilanGun,
    gorusme: hafta.gorusmeToplam,
    kota,
    kayit: hafta.kayitToplam,
  });
  // [D#34/#36] AYNA karakter içeriği — kill switch kapalıysa gizli.
  const gunSorusu = karakterAcik ? gununSorusuSec(now) : null;
  const aynaNotu = karakterAcik ? yolGunluguSec(now) : null;

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      {ziliGoster && <Konfeti key={Date.now()} />}
      {ziliGoster && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center bg-black/60 p-6">
          <div className="kart-cam rounded-3xl p-8 text-center">
            <p className="text-5xl" aria-hidden>🔔</p>
            <h2 className="prizma-serif ay-metin mt-3 text-2xl font-bold text-gold-light">Kayıt Zili!</h2>
            <p className="mt-2 text-sm text-slate-300">Şahitlerine haber gitti — liderliğini gösterdin.</p>
          </div>
        </div>
      )}

      {/* [B#23] Geri dönüş kutlaması — uzun aradan sonra dönmeyi ÖDÜLLENDİR
          (kaçırmayı cezalandırma). Konfeti + sıcak, suçlamasız mesaj. */}
      {geriDonus > 0 && <Konfeti key={`gd-${geriDonus}`} />}
      {geriDonus > 0 && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center bg-black/60 p-6">
          <div className="kart-cam rounded-3xl p-8 text-center">
            <p className="text-5xl" aria-hidden>🔥</p>
            <h2 className="prizma-serif ay-metin mt-3 text-2xl font-bold text-gold-light">
              Geri döndün{lakap ? `, ${lakap}` : ""}!
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {geriDonus} günlük aradan sonra bugün geri döndün — asıl güç bu. Yeni serin
              işte şimdi başlıyor. 🌱
            </p>
          </div>
        </div>
      )}

      {/* Kimlik (gün + evre) page.tsx'te — burada tek satır başlık yeter. */}
      <h1 className="prizma-serif ay-metin text-center text-xl font-semibold">{t.baslik}</h1>

      {/* [#8] Nazik bildirim şeridi — şahit alkışı/hatırlatma kaçmasın */}
      <BildirimSerit yer="takip" />

      {/* [Faz 6] "Bunu sen söyledin" — milestone anında kendi sesini dinlet. */}
      {milestone && sozSesUrl && (
        <div className="kart-cam rounded-2xl border border-gold/30 p-5 text-center">
          <p className="text-3xl" aria-hidden>🎙️</p>
          <h2 className="prizma-serif ay-metin mt-2 text-lg font-bold text-gold-light">{milestone.baslik}</h2>
          <p className="mt-1 text-sm text-slate-300">{milestone.metin}</p>
          <div className="mt-3">
            <KonusanYansima videoUrl={null} sesUrl={sozSesUrl} etiket="Sözünü dinle" />
          </div>
        </div>
      )}

      {/* [G#47] MEZUNİYET — 90 günü tamamlayana kapstone: söz-yüzleşme + sezon
          özeti + kendi sözünü dinletme. Yolculuğun en tepesinde, her şeyin üstünde. */}
      {mezuniyet && (
        <section className="kart-cam relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/[0.12] to-transparent p-6 text-center">
          <Konfeti key="mezuniyet" />
          <p className="text-5xl" aria-hidden>🎓</p>
          <h2 className="prizma-serif altin-metin mt-2 text-2xl font-bold">
            90 Günü Tamamladın{lakap ? `, ${lakap}` : ""}!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Bir söz verdin ve 90 gün onun peşinde yürüdün. Bu, çoğu insanın yapamadığı şey.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { v: mezuniyet.adimGun, e: "gün adım" },
              { v: mezuniyet.gorusme, e: "görüşme" },
              { v: mezuniyet.kayit, e: "kayıt" },
            ].map((s) => (
              <div key={s.e} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="font-display text-2xl font-bold text-gold-light">{s.v}</div>
                <div className="text-[0.7rem] text-slate-400">{s.e}</div>
              </div>
            ))}
          </div>
          {sozSesUrl && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                90 gün önce bunu SEN söylemiştin
              </p>
              <KonusanYansima videoUrl={null} sesUrl={sozSesUrl} etiket="Sözünü dinle" />
            </div>
          )}
          <p className="mt-4 border-t border-white/10 pt-3 text-sm italic leading-relaxed text-gold-light">
            O sözü verirken bugünkü sen&apos;i hayal etmiştin. İşte buradasın. Şimdi sıra bir sonraki
            sözde — yolculuk bitmez, sadece yükselir.
          </p>
        </section>
      )}

      {/* [D#33] AY DÖNÜMÜ MEKTUBU — 30/60/90. günde AYNA'nın kişisel mektubu. */}
      {mektupMilestone > 0 && <AyMektubuKarti milestone={mektupMilestone} />}

      {/* [E#41] AYNA'nın sessizliğine karşı kaydettiği kişisel ses mesajı —
          uzun aradan sonra en sıcak dokunuş; check-in'in hemen üstünde. */}
      {sessizSesUrl && (
        <div className="kart-cam rounded-2xl border border-gold/30 bg-gold/[0.05] p-5 text-center">
          <p className="text-3xl" aria-hidden>🎧</p>
          <h2 className="prizma-serif ay-metin mt-2 text-lg font-bold text-gold-light">
            AYNA senin için bir şey kaydetti
          </h2>
          <p className="mt-1 text-sm text-slate-300">Bir süredir yoktun. 30 saniyeni ayır — sonra tek bir adım.</p>
          <div className="mt-3">
            <KonusanYansima videoUrl={null} sesUrl={sessizSesUrl} etiket="Dinle" />
          </div>
        </div>
      )}

      {/* ═══ 1) GÜNÜN TEK İŞİ: CHECK-IN — kahraman, en üstte ═══ */}
      <section className="kart-cam rounded-2xl p-5">
        {isaretli ? (
          <p className="text-center text-base font-semibold text-emerald-300">
            {t.bugunKisa(durum.seri)}
          </p>
        ) : (
          <>
            <p className="text-base font-semibold text-slate-100">{t.bugunSoru}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-400">Kaç görüşme?</span>
                <input
                  inputMode="numeric"
                  value={gorusme}
                  onChange={(e) => setGorusme(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">Kaç kayıt?</span>
                <input
                  inputMode="numeric"
                  value={kayit}
                  onChange={(e) => setKayit(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
            </div>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value.slice(0, 500))}
              rows={2}
              placeholder={t.notYer}
              className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
            />
            <div className="mt-2">
              <MikrofonButonu
                onMetin={(p) => setNot((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 500))}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => checkin(true)}
                disabled={mesgul}
                className="btn-kor parilti flex h-12 flex-1 items-center justify-center rounded-xl text-base font-bold disabled:opacity-50"
              >
                {t.evet}
              </button>
              <button
                onClick={() => checkin(false)}
                disabled={mesgul}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-slate-400 hover:bg-midnight-soft disabled:opacity-50"
              >
                {t.hayir}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ═══ 2) TEK ÖZET SATIRI: seri + 90 gün (1. gün yumuşatma) ═══ */}
      {durum.toplam > 0 || durum.seri > 0 || isaretli ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {/* [B#21] Rütbe satırı — mevcut unvan + sonraki eşiğe kalan gün */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold text-gold-light">
              <span className="text-base" aria-hidden>{rutbe.mevcut.ikon}</span>
              {rutbe.mevcut.ad}
            </span>
            {rutbe.sonraki && (
              <span className="text-[0.7rem] font-medium text-slate-400">
                {rutbe.sonraki.ikon} {rutbe.sonraki.ad}&apos;e {rutbe.kalan} gün
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">
              {durum.seri > 0 ? t.seri(durum.seri) : t.seriYok}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {t.ozetIlerleme(Math.min(durum.toplam, 90))}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((durum.toplam / 90) * 100))}%` }}
            />
          </div>
          {/* [C#22] Seri sigortası — ayda 1 joker; tek kaçırılan gün seriyi bozmaz */}
          <p className="mt-2 text-xs text-slate-400">
            {durum.sigortaBuAyKullanildi
              ? "🛡 Seri sigortan bu ay kullanıldı — bir sonraki ay yenilenir."
              : "🛡 Seri sigortan hazır: bu ay bir günü kaçırsan serin bozulmaz."}
          </p>
        </div>
      ) : (
        <p className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-center text-sm font-medium text-gold-light">
          {t.baslamaGun}
        </p>
      )}

      {/* [E#37] HAFTALIK KOÇ NOTU — bu haftanın değerlendirmesi + gelecek haftanın
          TEK odağı. Deterministik (AI yok); Pazar push'u da buraya yönlendirir. */}
      <section className="rounded-2xl border border-royal-light/25 bg-royal/[0.06] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-royal-light/80">🧭 Koç notu</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{kocNotu.ozet}</p>
        <p className="mt-2 border-t border-white/10 pt-2 text-sm font-medium leading-relaxed text-gold-light">
          {kocNotu.odak}
        </p>
      </section>

      {/* [D#34] GÜNÜN SORUSU — AYNA'nın her gün değişen tek yansıma sorusu.
          İstersen /gunluk'a yaz; yazmasan da zihinde döner. */}
      {gunSorusu && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">🌙 Günün sorusu · AYNA</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{gunSorusu}</p>
          <Link
            href="/gunluk"
            className="mt-2 inline-block text-xs font-medium text-royal-light underline-offset-2 hover:underline"
          >
            Günlüğüne yaz →
          </Link>
        </section>
      )}

      {/* Nazik seri — tek cümle (yalnız bugün işaretlenmemiş + ara verilmişse) */}
      {durum.bugunYapildi !== true && durum.kacirilanGun >= 1 && durum.kacirilanGun < 900 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-300">
          {durum.kacirilanGun === 1
            ? "Dün ara verdin — sorun değil. Yeni serin bugün, tek işaretle başlar."
            : `${durum.kacirilanGun} gündür ara verdin — yol uzun. Bugün tek işaretle geri dön.`}
        </p>
      )}

      {/* ═══ 3) YOL DETAYLARI — ikincil her şey burada, varsayılan KAPALI ═══ */}
      <details className="group rounded-2xl border border-white/10 bg-white/[0.02]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300">
          <span>📂 {t.detaylar}</span>
          <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="space-y-4 border-t border-white/10 p-4">
          {/* [C#24] PAYLAŞILABİLİR YOLCULUK KARTI — ekran görüntüsü dostu özet.
              Rütbe + üç sayı; kişi ekran görüntüsüyle ilerlemesini paylaşabilir. */}
          <div className="overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.12] via-royal/[0.06] to-transparent p-4 text-center">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-slate-400">
              Liderlik Aynası · 90 Gün
            </p>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-lg font-bold text-gold-light">
              <span className="text-xl" aria-hidden>{rutbe.mevcut.ikon}</span>
              {rutbe.mevcut.ad}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { v: durum.toplam, e: "gün adım" },
                { v: durum.seri, e: "seri 🔥" },
                { v: hafta.gorusmeToplam, e: "bu hafta görüşme" },
              ].map((s) => (
                <div key={s.e}>
                  <div className="font-display text-xl font-bold text-slate-100">{s.v}</div>
                  <div className="text-[0.6rem] leading-tight text-slate-400">{s.e}</div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[0.6rem] text-slate-500">📸 Ekran görüntüsü al, yolunu paylaş</p>
          </div>

          {/* [D#36] AYNA'NIN YOL GÜNLÜĞÜ — haftada bir değişen birinci-tekil not */}
          {aynaNotu && (
            <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-light/80">📻 AYNA&apos;dan</p>
              <p className="mt-1 text-xs italic leading-relaxed text-slate-300">{aynaNotu}</p>
            </div>
          )}

          {/* Haftan özeti + çalışılan kas */}
          {(haftanGorev > 0 || haftanCheckin > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {tr.yolculukUx.haftanGorev(haftanGorev)}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {tr.yolculukUx.haftanKivilcim(haftanKivilcim)}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {tr.yolculukUx.haftanCheckin(haftanCheckin)}
              </span>
            </div>
          )}
          {kasAd && <p className="text-xs leading-relaxed text-slate-400">💪 {t.detayKas(kasAd)}</p>}

          {/* Görüşme kotası */}
          {kota != null && (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>{t.detayGorusmeKota}</span>
                <span className="text-slate-300">
                  {hafta.gorusmeToplam} / {kota}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400/70 transition-all duration-700"
                  style={{ width: `${kotaOrani ?? 0}%` }}
                />
              </div>
              {hafta.kayitToplam > 0 && (
                <p className="mt-1.5 text-xs text-gold-light">🔔 Bu hafta {hafta.kayitToplam} kayıt aldın</p>
              )}
            </div>
          )}

          {/* Haftanın ritmi — tek ikon satırı (4 satır yerine) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.detayRitim}</p>
            <p className="mt-1 text-xs text-slate-400">🌙 Her akşam · 🤝 Pzt · 📊 Paz · 🏁 30/60/90</p>
          </div>

          {/* Son 14 gün — başlıksız ince şerit */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.son14}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {durum.son14.map((g) => (
                <span
                  key={g.gun}
                  title={g.gun}
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                    g.yapildi === true
                      ? "bg-emerald-500/70 text-[#04140c]"
                      : g.yapildi === false
                        ? "bg-white/10 text-slate-500"
                        : "bg-white/5 text-slate-600"
                  }`}
                >
                  {g.yapildi === true ? "✓" : g.yapildi === false ? "·" : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Ortak momentum */}
          {ortakMomentum && (
            <p className="text-xs text-slate-400">
              🌐 Çevrende {ortakMomentum.cevreToplam} kişiden{" "}
              <span className="font-semibold text-emerald-300">{ortakMomentum.buHaftaAktif}</span> şu an
              sözünü tutuyor.
            </p>
          )}

          {/* Değerin bu hafta — kısaltılmış (3 satır) */}
          {degerDavranisi && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">✨ Değerin bu hafta</p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{degerDavranisi}</p>
            </div>
          )}

          {/* Sözündeki adımlar — işaretlenebilir kontrol listesi */}
          {aksiyonlar.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.aksiyonHatirlatma}
                </p>
                <span className="text-[0.7rem] font-semibold text-emerald-300">
                  {tamamlanan.size}/{aksiyonlar.length}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {aksiyonlar.map((a, i) => {
                  const bitti = tamamlanan.has(i);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => aksiyonToggle(i)}
                        disabled={aksMesgul !== null}
                        className="flex w-full items-start gap-2 text-left text-sm disabled:opacity-60"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.6rem] ${
                            bitti
                              ? "border-emerald-400 bg-emerald-500/80 text-white"
                              : "border-white/30 bg-transparent text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] font-bold text-slate-400">
                          {ufukAyEtiket(a.ufuk, now)}
                        </span>
                        <span className={bitti ? "text-slate-500 line-through" : "text-slate-300"}>
                          {a.metin}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </details>

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          {t.anaSayfa}
        </Link>
      </p>
    </div>
  );
}
