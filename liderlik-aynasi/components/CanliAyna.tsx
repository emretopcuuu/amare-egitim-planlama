"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { useEsc } from "@/lib/useEsc";

const t = tr.canliAyna;

const ADIMLAR = [
  { aci: "duz", yonerge: t.duz, ikon: "🙂" },
  { aci: "sag", yonerge: t.sag, ikon: "➡️" },
  { aci: "sol", yonerge: t.sol, ikon: "⬅️" },
] as const;

// Selfie sonrası "Canlı Ayna": çemberde düz/sağ/sol yüz kareleri (KYC hissi).
// Video üretiminde mimik malzemesi için. Kamera tam ekran sihirbaz.
//
// `gomulu`: Ritüel'in kendi adım akışına gömülü kullanıldığında (ses kaydından
// ÖNCE) sayfa yenilemez — akışı Ritüel'in kendi state'i yönetir, `onTamam`
// çağrılır. Bağımsız kullanımda (Pusula hub'ı) eskisi gibi router.refresh().
export default function CanliAyna({
  varMi = false,
  gomulu = false,
  onTamam,
}: {
  varMi?: boolean;
  gomulu?: boolean;
  onTamam?: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const akisRef = useRef<MediaStream | null>(null);
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState(0);
  const [kareler, setKareler] = useState<{ aci: string; blob: Blob }[]>([]);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(varMi);
  // Ekstra referans fotoğrafları (opsiyonel, 3 zorunlu açıdan sonra) — video
  // üretiminin çoklu-referans girdisini büyütüp kaliteyi yükseltir.
  const [ekstraYukleniyor, setEkstraYukleniyor] = useState(false);
  const [ekstraSayisi, setEkstraSayisi] = useState(0);
  const [ekstraHata, setEkstraHata] = useState<string | null>(null);
  useEsc(acik, () => kapat());

  function durdur() {
    akisRef.current?.getTracks().forEach((iz) => iz.stop());
    akisRef.current = null;
  }
  useEffect(() => () => durdur(), []);

  // Akışı video elemanına, eleman DOM'a girdikten SONRA bağla (rAF yarışı yok).
  useEffect(() => {
    const v = videoRef.current;
    if (acik && v && akisRef.current) {
      v.srcObject = akisRef.current;
      v.play().catch(() => {});
    }
  }, [acik]);

  async function baslat() {
    setHata(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHata(t.desteklenmiyor);
      return;
    }
    try {
      const akis = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
      });
      akisRef.current = akis;
      setAdim(0);
      setKareler([]);
      setAcik(true); // effect akışı bağlar
    } catch (e) {
      const ad = (e as { name?: string })?.name ?? "";
      if (ad === "NotAllowedError" || ad === "SecurityError") setHata(t.izinRet);
      else if (ad === "NotFoundError" || ad === "OverconstrainedError") setHata(t.kameraYok);
      else if (ad === "NotReadableError") setHata(t.kameraMesgul);
      else setHata(t.izinHata);
    }
  }

  async function cek() {
    const v = videoRef.current;
    if (!v || mesgul) return;
    const boyut = Math.min(v.videoWidth, v.videoHeight) || 720;
    const c = document.createElement("canvas");
    c.width = boyut;
    c.height = boyut;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const sx = (v.videoWidth - boyut) / 2;
    const sy = (v.videoHeight - boyut) / 2;
    ctx.drawImage(v, sx, sy, boyut, boyut, 0, 0, boyut, boyut);
    const blob = await new Promise<Blob | null>((res) =>
      c.toBlob(res, "image/jpeg", 0.9)
    );
    if (!blob) return;
    const yeni = [...kareler, { aci: ADIMLAR[adim].aci, blob }];
    setKareler(yeni);
    if (adim < ADIMLAR.length - 1) {
      setAdim(adim + 1);
    } else {
      await gonder(yeni);
    }
  }

  async function gonder(hepsi: { aci: string; blob: Blob }[]) {
    setMesgul(true);
    setHata(null);
    try {
      const form = new FormData();
      for (const k of hepsi) form.append(k.aci, k.blob, `${k.aci}.jpg`);
      const res = await fetch("/api/yuz-yakala", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      durdur();
      setAcik(false);
      setBitti(true);
      // Gömülüyken hemen ileri atlama — kişi isterse ekstra fotoğraf ekleyip
      // "Devam Et" ile kendi kararıyla geçer. Bağımsız kullanımda (Pusula
      // hub'ı) dış "tamam" durumu güncellensin diye sayfa tazelenir.
      if (!gomulu) router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  async function ekstraSec(e: ChangeEvent<HTMLInputElement>) {
    const dosyalar = Array.from(e.target.files ?? []);
    e.target.value = ""; // aynı dosyayı tekrar seçebilsin diye sıfırla
    if (dosyalar.length === 0) return;
    setEkstraYukleniyor(true);
    setEkstraHata(null);
    try {
      const form = new FormData();
      for (const f of dosyalar) form.append("foto", f);
      const res = await fetch("/api/yuz-ekstra", { method: "POST", body: form });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setEkstraHata(veri?.hata ?? t.ekstraHata);
        return;
      }
      setEkstraSayisi((n) => n + (veri?.sayi ?? dosyalar.length));
    } catch {
      setEkstraHata(t.ekstraHata);
    } finally {
      setEkstraYukleniyor(false);
    }
  }

  function kapat() {
    durdur();
    setAcik(false);
  }

  // Yeniden çekim: mevcut Canlı Aynadan memnun olmayan kişi 3 açıyı baştan çeker.
  // Sunucu-reset'e (hazirlik-sifirla) ya da kamp kilidine BAĞLI DEĞİL — kişinin
  // kendi yüzü, her an değiştirilebilir. gonder() yeni "düz" kareyle avatarı da
  // günceller (bkz. /api/yuz-yakala).
  function yenidenCek() {
    setBitti(false);
    baslat();
  }

  if (bitti && !acik) {
    return (
      <div className="space-y-3 text-left">
        <p className="text-sm font-medium text-emerald-400">{t.tamam}</p>
        {/* Ekstra referans fotoğrafları — opsiyonel, video kalitesini artırır. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-gold-light">{t.ekstraBaslik}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.ekstraAciklama}</p>
          <label
            className={`mt-3 flex h-11 w-full items-center justify-center rounded-xl border-2 border-dashed text-sm font-semibold transition-colors ${
              ekstraYukleniyor
                ? "cursor-not-allowed border-white/10 text-slate-500"
                : "cursor-pointer border-white/20 text-slate-200 hover:border-gold/50"
            }`}
          >
            {ekstraYukleniyor ? t.ekstraYukleniyor : t.ekstraSec}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={ekstraSec}
              disabled={ekstraYukleniyor}
            />
          </label>
          {ekstraSayisi > 0 && (
            <p className="mt-2 text-xs font-medium text-emerald-400">{t.ekstraEklendi(ekstraSayisi)}</p>
          )}
          {ekstraHata && <p className="mt-2 text-xs text-red-400">{ekstraHata}</p>}
        </div>
        {/* Gömülüyken (Ritüel içinde) ilerlemek kişinin kendi kararı olsun. */}
        {gomulu && (
          <button
            onClick={() => onTamam?.()}
            className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold"
          >
            {t.devamEt} →
          </button>
        )}

        {/* Fotoğrafından memnun değilse 3 açıyı baştan çeksin — her an, kamp
            kilidinden bağımsız. Yeni "düz" kare avatarı da günceller. */}
        <div className="pt-1">
          <button
            type="button"
            onClick={yenidenCek}
            disabled={mesgul}
            className="text-sm font-medium text-amber-300 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {t.yenidenCek}
          </button>
          <p className="mt-1 text-xs text-slate-500">{t.yenidenCekNot}</p>
        </div>
      </div>
    );
  }

  if (!acik) {
    return (
      <div className="space-y-2">
        <button
          onClick={baslat}
          className="btn-kor flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
        >
          {t.basla}
        </button>
        {hata && <p className="text-sm text-red-400">{hata}</p>}
      </div>
    );
  }

  // Tam ekran kamera — transform'lu ata `fixed`'i hapsetmesin diye portal ile body'ye.
  const katman = (
    <div
      role="dialog"
      aria-modal="true"
      className="koyu-alan fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black px-6 py-8"
    >
      <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
        {t.ust}
      </p>
      <p className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{t.ustBaslik}</p>

      {/* Belirgin yönerge — büyük ikon + kalın metin + adım sayacı (kişi her
          karede ne yapacağını net görür; küçük gri satır fark edilmiyordu). */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/45 bg-gold/10 px-5 py-3 shadow-[0_0_24px_-6px_rgba(245,158,11,0.5)]">
        <span aria-hidden className="text-3xl leading-none">{ADIMLAR[adim].ikon}</span>
        <span className="text-2xl font-bold text-gold-light">{ADIMLAR[adim].yonerge}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-400">{t.adimSayac(adim + 1, ADIMLAR.length)}</p>

      <div className="relative my-5 h-72 w-72">
        <div className="h-full w-full overflow-hidden rounded-full ring-4 ring-gold/60">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="h-full w-full -scale-x-100 object-cover"
          />
        </div>
        {/* Yön oku — hangi tarafa döneceğini net gösterir (emoji değil, SVG:
            yazı tipine göre bozuk görünme riski yok, bkz. AynaIkon deseni).
            Çemberin İÇİNDE, kenara yakın: dışa taşırsak dar telefon
            ekranlarında viewport'tan kesilir. */}
        {ADIMLAR[adim].aci !== "duz" && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 flex items-center ${
              ADIMLAR[adim].aci === "sag" ? "right-3" : "left-3"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-10 w-10 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.65)] ${
                ADIMLAR[adim].aci === "sag" ? "yon-oku-sag" : "yon-oku-sol"
              }`}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {ADIMLAR.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i <= adim ? "w-6 bg-gold" : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>

      {hata && <p className="mt-3 text-sm text-red-400">{hata}</p>}

      <button
        onClick={cek}
        disabled={mesgul}
        className="btn-kor parilti mt-6 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
      >
        {mesgul ? t.gonderiliyor : t.cek}
      </button>
      <button onClick={kapat} className="mt-3 text-sm text-slate-400 hover:text-slate-200">
        {t.vazgec}
      </button>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(katman, document.body) : null;
}
