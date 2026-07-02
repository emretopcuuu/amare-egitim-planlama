"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import {
  WA_SABLONLAR,
  type WaSablonAnahtar,
  degiskenleriUret,
  onizleme,
} from "@/lib/whatsappSablonlari";

const t = tr.admin.whatsapp;

type Kisi = { id: string; ad: string; takim: string | null; telefonVar: boolean; girisYapti?: boolean };
type HedefTipi = "genel" | "takim" | "kisiler" | "odevYapmayan" | "girisYapmamis";

export default function WhatsAppGonder({
  yapilandirildi,
  takimlar,
  kisiler,
  odevYapmayanSayisi,
  girisYapmamisSayisi,
  telefonsuz,
  kayitliAnahtarlar,
  sadeceSablonlar,
}: {
  yapilandirildi: boolean;
  takimlar: string[];
  kisiler: Kisi[];
  odevYapmayanSayisi: number;
  girisYapmamisSayisi?: number;
  telefonsuz: number;
  kayitliAnahtarlar: string[];
  sadeceSablonlar?: WaSablonAnahtar[];
}) {
  const gosterilecekSablonlar = sadeceSablonlar
    ? WA_SABLONLAR.filter((s) => sadeceSablonlar.includes(s.anahtar))
    : WA_SABLONLAR;

  const router = useRouter();
  const [sablonAnahtar, setSablonAnahtar] = useState<WaSablonAnahtar | null>(
    sadeceSablonlar?.length === 1 ? sadeceSablonlar[0] : null
  );
  const [hedefTipi, setHedefTipi] = useState<HedefTipi>("genel");
  const [takim, setTakim] = useState<string>(takimlar[0] ?? "");
  const [seciliKisiler, setSeciliKisiler] = useState<Set<string>>(new Set());
  const [mesaj, setMesaj] = useState("");
  const [onayAcik, setOnayAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  // [M1] Kişi bazlı teslim sonucu — tost kaybolur, bu panel kalır: kim davet
  // alamadı, kim kamp kodu alamadı → admin WhatsApp'tan elle takip eder.
  const [ulasmayanlar, setUlasmayanlar] = useState<{ davet: string[]; kod: string[] } | null>(null);

  const sablon = WA_SABLONLAR.find((s) => s.anahtar === sablonAnahtar) ?? null;
  const telefonluToplam = kisiler.filter((k) => k.telefonVar).length;

  // Seçili kitlenin yaklaşık telefonlu kişi sayısı (UI bilgisi).
  const hedefSayisi = useMemo(() => {
    if (hedefTipi === "genel") return telefonluToplam;
    if (hedefTipi === "takim")
      return kisiler.filter((k) => k.takim === takim && k.telefonVar).length;
    if (hedefTipi === "odevYapmayan") return odevYapmayanSayisi;
    if (hedefTipi === "girisYapmamis") return girisYapmamisSayisi ?? 0;
    if (hedefTipi === "kisiler")
      return kisiler.filter((k) => seciliKisiler.has(k.id) && k.telefonVar).length;
    return 0;
  }, [hedefTipi, takim, seciliKisiler, kisiler, telefonluToplam, odevYapmayanSayisi, girisYapmamisSayisi]);

  const onizlemeMetni = sablon
    ? onizleme(sablon, degiskenleriUret(sablon, { ad: sablon.ornek["1"], kod: sablon.ornek["2"] }, mesaj || sablon.ornek["2"]))
    : "";

  function kisiSec(id: string) {
    setSeciliKisiler((eski) => {
      const yeni = new Set(eski);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });
  }

  const gonderilebilir =
    !!sablon &&
    yapilandirildi &&
    kayitliAnahtarlar.includes(sablon.anahtar) &&
    hedefSayisi > 0 &&
    (!sablon.serbestMi || mesaj.trim().length > 0) &&
    !gonderiliyor;

  async function gonder() {
    if (!sablon) return;
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sablon: sablon.anahtar,
          hedefTipi,
          takim: hedefTipi === "takim" ? takim : undefined,
          kisiIds: hedefTipi === "kisiler" ? [...seciliKisiler] : undefined,
          mesaj: sablon.serbestMi ? mesaj.trim() : undefined,
        }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        tost(veri?.hata ?? t.api.hedefYok, "hata");
        return;
      }
      const kodNot =
        typeof veri.kodGonderildi === "number"
          ? veri.kodKayitsiz
            ? " · ⚠ kamp kodu şablonu kayıtsız, kod gönderilmedi"
            : ` · ${veri.kodGonderildi} kamp kodu gönderildi`
          : "";
      tost(t.sonuc(veri.basarili, veri.basarisiz, veri.telefonsuz) + kodNot, "basari");
      const davetKacan: string[] = Array.isArray(veri.davetUlasmayan) ? veri.davetUlasmayan : [];
      const kodKacan: string[] = Array.isArray(veri.kodUlasmayan) ? veri.kodUlasmayan : [];
      setUlasmayanlar(davetKacan.length > 0 || kodKacan.length > 0 ? { davet: davetKacan, kod: kodKacan } : null);
      setOnayAcik(false);
      router.refresh();
    } catch {
      tost(t.api.hedefYok, "hata");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="kart-3d space-y-5 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      {/* [M1] Teslim doğrulaması — ulaşamayan davet/kod isimleri kalıcı panelde */}
      {ulasmayanlar && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-amber-200">⚠ Son gönderimde herkese ulaşılamadı</p>
            <button
              onClick={() => setUlasmayanlar(null)}
              className="shrink-0 rounded-lg px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          {ulasmayanlar.davet.length > 0 && (
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              <span className="font-semibold">Davet ulaşmadı:</span> {ulasmayanlar.davet.join(", ")}
            </p>
          )}
          {ulasmayanlar.kod.length > 0 && (
            <p className="mt-1.5 text-xs leading-relaxed text-amber-100/90">
              <span className="font-semibold">Kamp kodu ulaşmadı:</span> {ulasmayanlar.kod.join(", ")}
              <span className="text-amber-200/70"> (davetteki buton linki kodu içerir — yine de giriş yapabilirler)</span>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Bu kişileri WhatsApp&apos;tan elle kontrol et; telefon numarası hatalı olabilir.
          </p>
        </div>
      )}

      {/* 1) Şablon seçimi */}
      <div>
        <h2 className="text-sm font-semibold text-gold-light">{t.adim1}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {gosterilecekSablonlar.map((s) => {
            const kayitli = kayitliAnahtarlar.includes(s.anahtar);
            const secili = sablonAnahtar === s.anahtar;
            return (
              <button
                key={s.anahtar}
                onClick={() => setSablonAnahtar(s.anahtar)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  secili
                    ? "border-gold/60 bg-gold/10"
                    : "border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <span className="text-base" aria-hidden>
                  {s.ikon}
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-100">{s.etiket}</p>
                <p className="mt-0.5 text-xs text-slate-400">{s.aciklama}</p>
                {!kayitli && (
                  <p className="mt-1 text-[0.7rem] font-medium text-amber-300">{t.onayBekliyor}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {sablon && (
        <>
          {/* 2) Serbest mesaj (yalnız duyuru) */}
          {sablon.serbestMi && (
            <div>
              <h2 className="text-sm font-semibold text-gold-light">{t.adimMesaj}</h2>
              <textarea
                value={mesaj}
                onChange={(e) => setMesaj(e.target.value)}
                maxLength={600}
                rows={4}
                placeholder={t.mesajIpucu}
                className="mt-2 w-full rounded-xl border border-white/15 bg-midnight/60 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-gold/50 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-slate-500">{mesaj.length}/600</p>
            </div>
          )}

          {/* 3) Kitle seçimi */}
          <div>
            <h2 className="text-sm font-semibold text-gold-light">{t.adim2}</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["genel", t.hedefGenel],
                ["takim", t.hedefTakim],
                ...(sablonAnahtar !== "giris" && sablonAnahtar !== "giris_hatirlatma"
                  ? [["odevYapmayan", t.hedefOdev(odevYapmayanSayisi)]]
                  : []),
                ...((sablonAnahtar === "giris" || sablonAnahtar === "giris_hatirlatma") && girisYapmamisSayisi !== undefined
                  ? [["girisYapmamis", `Giriş yapmamış (${girisYapmamisSayisi})`]]
                  : []),
                ["kisiler", t.hedefKisiler],
              ] as [HedefTipi, string][]).map(([tip, etiket]) => (
                <button
                  key={tip}
                  onClick={() => setHedefTipi(tip)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    hedefTipi === tip
                      ? "border-royal-light/60 bg-royal/30 text-gold-light"
                      : "border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {etiket}
                </button>
              ))}
            </div>

            {hedefTipi === "takim" && (
              <select
                value={takim}
                onChange={(e) => setTakim(e.target.value)}
                className="mt-3 w-full rounded-xl border border-white/15 bg-midnight/60 p-2.5 text-sm text-slate-100 focus:border-gold/50 focus:outline-none"
              >
                {takimlar.map((tk) => (
                  <option key={tk} value={tk}>
                    {tk}
                  </option>
                ))}
              </select>
            )}

            {hedefTipi === "kisiler" && (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-midnight/40 p-2">
                {kisiler.map((k) => (
                  <label
                    key={k.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      k.telefonVar ? "text-slate-200 hover:bg-white/[0.06]" : "text-slate-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seciliKisiler.has(k.id)}
                      onChange={() => kisiSec(k.id)}
                      disabled={!k.telefonVar}
                      className="h-4 w-4 accent-gold"
                    />
                    <span className="flex-1">{k.ad}</span>
                    {k.takim && <span className="text-xs text-slate-500">{k.takim}</span>}
                    {!k.telefonVar && <span className="text-xs text-amber-400">{t.telefonYok}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 4) Önizleme */}
          <div>
            <h2 className="text-sm font-semibold text-gold-light">{t.onizlemeBaslik}</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-400/20 bg-[#0b141a] p-4 font-sans text-sm leading-relaxed text-slate-100">
              {onizlemeMetni}
            </pre>
          </div>

          {/* 5) Gönder */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-slate-300">{t.hedefOzet(hedefSayisi)}</p>
            {telefonsuz > 0 && hedefTipi === "genel" && (
              <p className="mt-1 text-xs text-amber-400">{t.telefonsuzNot(telefonsuz)}</p>
            )}

            {onayAcik ? (
              <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
                <p className="text-sm font-medium text-slate-100">
                  {t.onaySoru(sablon.etiket, hedefSayisi)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={gonder}
                    disabled={gonderiliyor}
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
                  >
                    {gonderiliyor ? t.gonderiliyor : t.gonderEt}
                  </button>
                  <button
                    onClick={() => setOnayAcik(false)}
                    disabled={gonderiliyor}
                    className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
                  >
                    {t.vazgec}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setOnayAcik(true)}
                disabled={!gonderilebilir}
                className="btn-3d mt-3 rounded-xl bg-gold px-5 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.gonder}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
