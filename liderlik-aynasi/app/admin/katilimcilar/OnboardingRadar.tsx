"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";
import { basHarfler, renkSec } from "@/components/Avatar";
import type { OnboardingAdimKod } from "@/lib/onboardingSure";

export type RadarAsama = { kod: string; ad: string; tamam: number; toplam: number };
export type RadarKisi = {
  id: string;
  ad: string;
  foto: string | null;
  telefon: string | null;
  kod: string;
  eksikKod: OnboardingAdimKod;
  eksikAd: string;
  sonIlerlemeAt: string | null;
  pushVar: boolean;
  otoNudgeSayi: number;
  bildirimSayi: number;
  whatsappSayi: number;
  sonHatirlatAt: string | null;
  waLink: string | null;
};
type Donusum = { degerler: { hatirlatilan: number; tamamlayan: number }; oyun: { hatirlatilan: number; tamamlayan: number } };

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
// Bu araçla elle dürtülebilen aşamalar (in-app + push). Diğerleri: wa.me + otomatik.
const HEDEF_METIN: Record<"degerler" | "oyun", { baslik: string; govde: string }> = {
  degerler: { baslik: "Değerler çalışman yarım kaldı", govde: "Birkaç dakika ayır, üç temel değerini tamamla — kampa hazır gel. 💎" },
  oyun: { baslik: "Oyununu henüz seçmedin", govde: "Cumartesi oyunlarından ikisini seç, grubun belirlensin. 🎲" },
};

function MiniAvatar({ ad, url }: { ad: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/15" />;
  }
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${renkSec(ad)} text-[0.6rem] font-bold text-white`} aria-hidden>
      {basHarfler(ad)}
    </span>
  );
}

function sessizlik(sonAt: string | null, simdi: number): string {
  if (!sonAt) return "—";
  const saat = Math.floor((simdi - Date.parse(sonAt)) / 3_600_000);
  if (saat < 1) return "<1sa";
  if (saat < 48) return `${saat}sa`;
  return `${Math.floor(saat / 24)}g`;
}

export default function OnboardingRadar({
  toplam,
  pushVarSayi,
  asamalar,
  kisiler,
  donusum,
  otoAcik,
}: {
  toplam: number;
  pushVarSayi: number;
  asamalar: RadarAsama[];
  kisiler: RadarKisi[];
  donusum: Donusum;
  otoAcik: boolean;
  adimAdlari: Record<string, string>;
}) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [ara, setAra] = useState("");
  const [filtre, setFiltre] = useState<"hepsi" | "telefonsuz" | "pushsuz">("hepsi");
  const [asamaFiltre, setAsamaFiltre] = useState<string>("hepsi");
  const [onizlemeAcik, setOnizlemeAcik] = useState(false);
  // [#10] Canlı: 30 sn'de bir sunucuyu tazele (yenilemeden sayılar güncellensin).
  const [simdi, setSimdi] = useState(0);
  useEffect(() => {
    setSimdi(Date.now());
    const t = setInterval(() => { setSimdi(Date.now()); router.refresh(); }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  // Elle dürtülebilecekler: ŞU AN tam olarak o aşamada takılı olanlar (daha
  // erken aşamada takılıya yanlış mesaj gitmesin — onları otomatik/ wa.me kovalar).
  const stageTargets = (hedef: "degerler" | "oyun") =>
    kisiler.filter((k) => k.eksikKod === hedef);
  const degerlerT = stageTargets("degerler");
  const oyunT = stageTargets("oyun");

  const cooldownda = (k: RadarKisi) => !!k.sonHatirlatAt && simdi > 0 && simdi - Date.parse(k.sonHatirlatAt) < COOLDOWN_MS;

  async function durt(hedef: "degerler" | "oyun", kisiIds: string[], etiket: string) {
    const anahtar = `${hedef}-${etiket}`;
    if (mesgul) return;
    setMesgul(anahtar);
    try {
      const r = await fetch("/api/admin/onboarding-hatirlat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kisiIds.length === 1 ? { hedef, kisiId: kisiIds[0] } : { hedef, kisiIds }),
      });
      const v = await r.json().catch(() => null);
      if (r.ok && v?.ok) {
        const ek = v.uygulama > 0 ? ` · ${v.uygulama} yalnız uygulama-içi` : "";
        const atl = v.atlanan > 0 ? ` (${v.atlanan} atlandı — yakında dürtülmüştü)` : "";
        tost(v.gonderildi > 0 ? `${v.gonderildi} kişi dürtüldü${ek}${atl}` : `Gönderilecek kimse yok${atl}`, v.gonderildi > 0 ? "basari" : "hata");
        router.refresh();
      } else tost("Hatırlatma gönderilemedi", "hata");
    } catch {
      tost("Hatırlatma gönderilemedi", "hata");
    } finally {
      setMesgul(null);
    }
  }

  function kodKopyala(kod: string) {
    navigator.clipboard?.writeText(kod).then(
      () => tost(`Kod kopyalandı: ${kod}`, "basari"),
      () => tost("Kopyalanamadı", "hata")
    );
  }

  // WhatsApp linkine tıklanınca: dış uygulama zaten açılıyor; burada kişi başı
  // WhatsApp sayacını kaydet (kanal='whatsapp') → "kime kaç kez WhatsApp" görünür.
  function waKaydet(kisiId: string, asama: string) {
    fetch("/api/admin/onboarding-hatirlat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ whatsapp: true, kisiId, asama }),
    })
      .then(() => setTimeout(() => router.refresh(), 400))
      .catch(() => {});
  }

  // [#9] Arama + filtre
  const gosterilen = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return kisiler.filter((k) => {
      if (q && !k.ad.toLocaleLowerCase("tr").includes(q)) return false;
      if (filtre === "telefonsuz" && k.telefon) return false;
      if (filtre === "pushsuz" && k.pushVar) return false;
      if (asamaFiltre !== "hepsi" && k.eksikKod !== asamaFiltre) return false;
      return true;
    });
  }, [kisiler, ara, filtre, asamaFiltre]);

  // [#6] En acil eylem: elle dürtülebilen en kalabalık aşama.
  const enAcil = degerlerT.length >= oyunT.length
    ? { hedef: "degerler" as const, sayi: degerlerT.length, ad: "Değerler", ids: degerlerT }
    : { hedef: "oyun" as const, sayi: oyunT.length, ad: "Oyun seçimi", ids: oyunT };
  const pushsuz = toplam - pushVarSayi;

  return (
    <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">📡 Onboarding Radarı</h2>
        <span className="flex items-center gap-1 text-[0.65rem] text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> canlı
        </span>
      </div>

      {/* [#6] EN ACİL EYLEM */}
      {enAcil.sayi > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/[0.08] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gold-light">👉 En acil: {enAcil.sayi} kişi “{enAcil.ad}” aşamasında takılı</p>
            <p className="text-[0.7rem] text-slate-400">Tek tıkla dürt — push izni olanlara bildirim, olmayanlara uygulama-içi gelen kutusu.</p>
          </div>
          <button
            onClick={() => durt(enAcil.hedef, enAcil.ids.map((k) => k.id), "acil")}
            disabled={!!mesgul}
            className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {mesgul === `${enAcil.hedef}-acil` ? "Gönderiliyor…" : `${enAcil.sayi} kişiye dürt`}
          </button>
        </div>
      )}

      {/* [#4] Otomatik hatırlatma durumu */}
      <p className={`mb-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed ${otoAcik ? "bg-emerald-500/10 text-emerald-200" : "bg-white/5 text-slate-400"}`}>
        {otoAcik
          ? "🤖 Otomatik hatırlatma AÇIK — sistem, 3+ saat takılı kalan herkese saatlik kontrolle kendi kendine push atıyor (kişi başı en fazla 3 kez, ~20 saat arayla). Sen sadece hızlandırmak istersen dürtersin."
          : "🤖 Kamp canlı olduğu için otomatik onboarding hatırlatması durakladı (kamp içinde gürültü olmasın diye)."}
      </p>

      {/* [#7] HUNİ */}
      <div className="mb-4 space-y-1.5">
        {asamalar.map((a) => {
          const oran = a.toplam > 0 ? Math.round((a.tamam / a.toplam) * 100) : 0;
          const tam = a.tamam === a.toplam;
          return (
            <div key={a.kod} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-slate-300">{a.ad}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className={`block h-full rounded-full ${tam ? "bg-emerald-400" : "bg-gradient-to-r from-gold-dim to-gold"}`} style={{ width: `${oran}%` }} />
              </span>
              <span className={`w-14 shrink-0 text-right font-mono text-xs font-bold ${tam ? "text-emerald-300" : "text-slate-400"}`}>
                {a.tamam}/{a.toplam}{tam ? " ✓" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* [#1] Kanal-farkında toplu dürtme + [#8] dönüşüm + [#5] önizleme */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {(["degerler", "oyun"] as const).map((h) => {
          const hedefler = h === "degerler" ? degerlerT : oyunT;
          const pushlu = hedefler.filter((k) => k.pushVar).length;
          const d = donusum[h];
          return (
            <div key={h} className="rounded-xl bg-midnight-soft/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{h === "degerler" ? "💎 Değerler" : "🎲 Oyun / grup"}</span>
                <span className="font-mono text-xs text-slate-400">{hedefler.length} eksik</span>
              </div>
              {hedefler.length > 0 ? (
                <>
                  <p className="mt-1 text-[0.7rem] text-slate-500">{pushlu} kişi telefon push · {hedefler.length - pushlu} yalnız uygulama-içi</p>
                  <button
                    onClick={() => durt(h, hedefler.map((k) => k.id), "toplu")}
                    disabled={!!mesgul}
                    className="mt-2 w-full rounded-lg border border-royal-light/40 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
                  >
                    {mesgul === `${h}-toplu` ? "Gönderiliyor…" : `${hedefler.length} kişiye dürt`}
                  </button>
                </>
              ) : (
                <p className="mt-1 text-[0.7rem] text-emerald-300">✓ tamam</p>
              )}
              {d.hatirlatilan > 0 && (
                <p className="mt-1.5 text-[0.65rem] text-slate-500">Bugüne dek {d.hatirlatilan} dürtüldü → {d.tamamlayan} tamamladı</p>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={() => setOnizlemeAcik((v) => !v)} className="mb-3 text-[0.7rem] text-slate-500 underline hover:text-slate-300">
        {onizlemeAcik ? "Mesaj önizlemesini gizle" : "Dürtünce ne yazıyor? (önizleme)"}
      </button>
      {onizlemeAcik && (
        <div className="mb-3 space-y-1.5 rounded-lg border border-white/10 bg-[#0b141a] p-3 text-xs">
          {(["degerler", "oyun"] as const).map((h) => (
            <p key={h} className="text-slate-300"><b className="text-slate-100">{HEDEF_METIN[h].baslik}</b> — {HEDEF_METIN[h].govde}</p>
          ))}
          <p className="text-[0.65rem] text-slate-500">Push izni olana telefon bildirimi; olmayana uygulama-içi gelen kutusu. WhatsApp linki her kişide ayrı, hazır metinli.</p>
        </div>
      )}

      {/* [#2/#9] Kişi listesi: fotoğraf + arama + filtre + tekil aksiyonlar */}
      {kisiler.length === 0 ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">🎉 Takılan kimse yok — herkes yolunda.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="İsim ara…"
              className="h-8 min-w-[8rem] flex-1 rounded-lg border border-royal-light/30 bg-midnight-soft px-2.5 text-xs text-slate-100 outline-none focus:border-gold"
            />
            {(["hepsi", "telefonsuz", "pushsuz"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${filtre === f ? "bg-gold/20 text-gold-light ring-1 ring-gold/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                {f === "hepsi" ? "Hepsi" : f === "telefonsuz" ? "📵 Telefonsuz" : "🔕 Push yok"}
              </button>
            ))}
            <select
              value={asamaFiltre}
              onChange={(e) => setAsamaFiltre(e.target.value)}
              className="h-8 rounded-lg border border-royal-light/30 bg-midnight-soft px-2 text-[0.7rem] text-slate-200 outline-none focus:border-gold"
            >
              <option value="hepsi">Tüm aşamalar</option>
              {[...new Set(kisiler.map((k) => k.eksikKod))].map((k) => (
                <option key={k} value={k}>{kisiler.find((x) => x.eksikKod === k)?.eksikAd}</option>
              ))}
            </select>
          </div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.65rem] text-slate-500">
            <span>{gosterilen.length} kişi gösteriliyor</span>
            <span className="flex flex-wrap items-center gap-x-2.5">
              <span title="Sistemin otomatik gönderdiği dürtme sayısı">🤖 otomatik</span>
              <span title="Senin gönderdiğin uygulama-içi/push dürtme sayısı">🔔 senin dürtün</span>
              <span title="Senin WhatsApp'a tıklama (mesaj) sayın">💬 WhatsApp</span>
            </span>
          </div>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {gosterilen.map((k) => {
              const hedef: "degerler" | "oyun" | null =
                k.eksikKod === "degerler" ? "degerler" : k.eksikKod === "oyun" ? "oyun" : null;
              const enDurtulebilir = hedef !== null;
              const cd = cooldownda(k);
              return (
                <li key={k.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                  <MiniAvatar ad={k.ad} url={k.foto} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-100">{k.ad}</span>
                    <span className="flex flex-wrap items-center gap-x-1.5 truncate text-[0.65rem] text-amber-200/90">
                      <span>{k.eksikAd} · {sessizlik(k.sonIlerlemeAt, simdi)} sessiz</span>
                      {!k.pushVar && <span className="text-amber-300" title="Push izni yok — bu kişiye ancak WhatsApp ulaşır">🔕</span>}
                      {k.otoNudgeSayi > 0 && <span className="text-slate-400" title={`Sistem otomatik ${k.otoNudgeSayi} kez dürttü`}>🤖{k.otoNudgeSayi}</span>}
                      {k.bildirimSayi > 0 && <span className="text-sky-300" title={`Senin uygulama-içi/push dürtün: ${k.bildirimSayi} kez`}>🔔{k.bildirimSayi}</span>}
                      {k.whatsappSayi > 0 && <span className="text-emerald-300" title={`WhatsApp'a ${k.whatsappSayi} kez tıkladın`}>💬{k.whatsappSayi}</span>}
                      {cd && <span className="text-slate-500" title="Son 2 saatte dürtüldü (soğuma)">· dürtüldü</span>}
                    </span>
                  </span>
                  {k.waLink ? (
                    <a
                      href={k.waLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => waKaydet(k.id, k.eksikKod)}
                      className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 text-[0.65rem] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                      title="Hazır metinli WhatsApp gönder (sayılır)"
                    >💬</a>
                  ) : (
                    <span className="shrink-0 text-[0.6rem] text-slate-600" title="Telefon yok — WhatsApp gönderilemez">📵</span>
                  )}
                  <button onClick={() => kodKopyala(k.kod)} className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-mono text-slate-300 transition-colors hover:bg-white/10" title="Giriş kodunu kopyala">{k.kod}</button>
                  {hedef && enDurtulebilir ? (
                    <button
                      onClick={() => durt(hedef, [k.id], `tekil-${k.id}`)}
                      disabled={!!mesgul || cd}
                      className="shrink-0 rounded-md bg-gold/15 px-2 py-1 text-[0.65rem] font-bold text-gold-light transition-colors hover:bg-gold/25 disabled:opacity-40"
                      title={cd ? "Yakında dürtüldü (2 saat soğuma)" : "Uygulama-içi + push dürt"}
                    >🔔</button>
                  ) : (
                    <span className="shrink-0 text-[0.6rem] text-slate-600" title="Bu aşama otomatik dürtülüyor; WhatsApp'tan takip et">🤖</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-2 text-[0.65rem] text-slate-500">KVKK: yalnız sonuç (hangi adımda) gösterilir, içerik değil.</p>
    </div>
  );
}
