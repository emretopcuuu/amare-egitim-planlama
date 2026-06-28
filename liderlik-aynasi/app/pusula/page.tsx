import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";
import PusulaGiris from "./PusulaGiris";
import HazirlikAkis from "./HazirlikAkis";
import CanliAyna from "@/components/CanliAyna";
import GeriSayim from "@/components/GeriSayim";
import Konfeti from "@/components/Konfeti";
import AynaKurulum from "@/components/AynaKurulum";
import GunProgramKarti from "@/components/GunProgramKarti";

const t = tr.pusula;

// FAZ 0 — Nedenler çalışması + kamp öncesi hazırlık hub'ı. Pusula bitince kişi
// (hepsi opsiyonel) kendini puanlar, profil fotoğrafı + Canlı Ayna ekler, kamp
// rehberine bakar — sonra "kampta görüşürüz" beklemesi.
export default async function PusulaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [durum, gecmis, { data: kisi }, { data: pus }] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
    db
      .from("participants")
      .select("consent_at, profil_foto_path, yuz_fotolari, full_name, camp_unlocked_at, kariyer_seviyesi, team")
      .eq("id", session.sub)
      .maybeSingle(),
    db.from("pusula").select("oncelikler, slogan").eq("participant_id", session.sub).maybeSingle(),
  ]);

  // Kamp açıldıysa (oda QR'ı okutuldu ya da görevli elle açtı) Pusula
  // hub'ında/mühür ekranında oyalanma — doğrudan kamp akışına gönder.
  if (kisi?.camp_unlocked_at) redirect("/");

  // Pusula tamamsa ama ÖN FARKINDALIK penceresi açık ve bitmemişse, hub'dan ÖNCE
  // oraya gönder. Ana sayfa kapısı (pusula → ön farkındalık → bekleme) ile aynı
  // sıra: aksi halde masaüstü hub'da "takılı" görünüp telefonda ÖF çıkıyor,
  // ikisi tutarsız oluyordu.
  if (durum.tamam) {
    const [{ data: ofAyar }, { data: ofDurum }] = await Promise.all([
      db.from("settings").select("value").eq("key", "on_farkindalik_acik").maybeSingle(),
      db
        .from("on_farkindalik")
        .select("tamamlandi_at")
        .eq("participant_id", session.sub)
        .maybeSingle(),
    ]);
    if (ofAyar?.value === "true" && !ofDurum?.tamamlandi_at) redirect("/on-farkindalik");
  }

  const oncelikler = ((pus?.oncelikler as { sira: number; metin: string }[]) ?? [])
    .slice()
    .sort((a, b) => a.sira - b.sira)
    .map((o) => o.metin);

  const kisislogan = (pus as { slogan?: string | null } | null)?.slogan ?? null;

  if (durum.tamam) {
    const [ozellikler, { data: kampAyar }, { data: sesRow }, { data: hedefRow }, { data: ofRow }] =
      await Promise.all([
        aktifOzellikler(db),
        db.from("settings").select("value").eq("key", "kamp_tarihi").maybeSingle(),
        db.from("voice_profiles").select("participant_id").eq("participant_id", session.sub).maybeSingle(),
        db.from("hedef").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
        db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      ]);
    const ozTamam = await ozPuanTamamMi(db, session.sub, 1, ozellikler.length);
    const yuzVar = Array.isArray(kisi?.yuz_fotolari) && (kisi.yuz_fotolari as unknown[]).length > 0;
    const kampTarihi = kampAyar?.value ?? null;
    const sesVar = !!sesRow;
    const hedefTamam = !!hedefRow?.tamamlandi_at;
    const ofTamam = !!ofRow?.tamamlandi_at;

    // Mühür ekranı HAZIRLIK ÖZETİ: 6 adımın tek bakışta tik durumu + düzelt yolu.
    // Ses/Nedenler bu hub'a gelindiyse zaten tamam (ön koşul) — gösterip onaylarız;
    // Hedef/Farkındalık/Liderlik/Foto için doğrudan düzelt/yap bağlantısı verilir.
    const ozetAdimlar: { ad: string; tamam: boolean; href: string | null }[] = [
      { ad: t.ozetSes, tamam: sesVar, href: null },
      { ad: t.ozetNedenler, tamam: durum.tamam, href: null },
      { ad: t.ozetHedef, tamam: hedefTamam, href: "/hedef" },
      { ad: t.ozetFarkindalik, tamam: ofTamam, href: "/on-farkindalik" },
      { ad: t.ozetFoto, tamam: yuzVar, href: null },
      { ad: t.ozetLiderlik, tamam: ozTamam, href: `/degerlendir/${session.sub}` },
    ];

    const adimlar = [
      {
        k: "ozpuan",
        ikon: "⭐",
        baslik: t.adimPuanBaslik,
        metin: t.adimPuanMetin,
        tamam: ozTamam,
        aksiyon: (
          <Link
            href={`/degerlendir/${session.sub}`}
            className="btn-kor flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold"
          >
            {ozTamam ? t.adimPuanDuzelt : t.adimPuanDugme}
          </Link>
        ),
      },
      {
        k: "yuz",
        ikon: "🔮",
        baslik: t.adimYuzBaslik,
        metin: t.adimYuzMetin,
        tamam: yuzVar,
        aksiyon: <CanliAyna varMi={yuzVar} />,
      },
    ];
    const hepsiTamam = adimlar.every((a) => a.tamam);

    // Sakin dinlenme/bekleme ekranı — hamleler bitince (ya da geçilince) çıkar.
    // EN BÜYÜK mesaj: "mührü kaldırmadan devam edemezsin" (kampta QR okut).
    // Aday bundan sonra nasıl ilerleyeceğini buradan anlar; gerisi etrafında.
    const bekleIcerik = (
      <div className="space-y-5">
        {hepsiTamam && <Konfeti anahtar="hazirlik-tamam" />}

        {/* HERO — mühür kilidi: ekranın merkez, en baskın öğesi */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold/45 bg-gradient-to-b from-gold/12 to-midnight-card/70 p-7 text-center shadow-xl">
          <span className="altin-tel" />
          <p className="text-6xl leading-none" aria-hidden>
            🔒
          </p>
          <p className="mt-4 inline-block rounded-full bg-gold/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-gold-light">
            {t.muhurRozet}
          </p>
          {kisislogan ? (
            <>
              <p className="prizma-serif ay-metin mt-4 text-xl font-bold leading-snug italic">
                &ldquo;{kisislogan}&rdquo;
              </p>
              <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                Pusulam
              </p>
            </>
          ) : (
            <h1 className="prizma-serif ay-metin mt-3 text-2xl font-bold leading-snug">
              {t.muhurHeroBaslik}
            </h1>
          )}
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-300">
            {t.muhurHeroMetin}
          </p>
          <p className="mt-4 text-sm font-semibold text-gold-light">{t.muhurHeroNot}</p>
          {kampTarihi && <GeriSayim hedefZaman={kampTarihi} etiket={t.kampaKalan} />}
        </div>

        {/* HAZIRLIK ÖZETİ — tüm adımlar tek bakışta tik + düzelt (katılımcı isteği) */}
        <div className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
            ✅ {t.ozetBaslik}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.ozetAciklama}</p>
          <ul className="mt-3 space-y-1.5">
            {ozetAdimlar.map((a) => (
              <li
                key={a.ad}
                className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    a.tamam ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                  aria-hidden
                >
                  {a.tamam ? "✓" : "!"}
                </span>
                <span className="flex-1 text-sm text-slate-200">{a.ad}</span>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="shrink-0 text-xs font-semibold text-gold-light underline-offset-4 hover:underline"
                  >
                    {a.tamam ? t.ozetDuzelt : t.ozetYap} →
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500">
                    {a.tamam ? t.ozetTamam : t.ozetEksik}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* S9: Kilitli maddeler gerçek başlıkla — "Kampta açılır" chip kaldırıldı */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            ✨ {t.kilitBaslik}
          </p>
          <div className="space-y-2">
            {[
              { ikon: "🎙", metin: t.kilit1 },
              { ikon: "👁", metin: t.kilit2 },
              { ikon: "🤖", metin: t.kilit3 },
            ].map(({ ikon, metin }) => (
              <div key={metin} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5">
                <span className="text-base" aria-hidden>{ikon}</span>
                <span className="flex-1 text-sm text-slate-300">{metin}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bildirim izni — hatırlatmaların çalışması için */}
        <div className="rounded-2xl bg-midnight-card/40 p-4 ring-1 ring-royal/20">
          <p className="mb-2 text-sm font-semibold text-slate-200">🔔 {t.bildirimBaslik}</p>
          <AynaKurulum />
        </div>

        {/* Kamp rehberi — bilgi */}
        <Link
          href="/hosgeldin"
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-royal-light/40"
        >
          <span aria-hidden>📖</span>
          <span className="flex-1 text-sm text-slate-300">{t.adimRehberMetin}</span>
          <span className="text-sm font-semibold text-gold-light">{t.adimRehberDugme} →</span>
        </Link>

        {/* 3 günlük kamp programı — mühür açılmadan da görünsün */}
        <GunProgramKarti takim={kisi?.team ?? null} />
      </div>
    );

    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-md px-5 py-8">
          <HazirlikAkis adimlar={adimlar} bekleIcerik={bekleIcerik} />
        </div>
      </main>
    );
  }

  // Sinematik açılış: henüz pusula egzersizine başlamamış (öncelik girmemiş)
  // herkese oynar. NOT: consent_at'e BAKMAYIZ — o, ses ritüelinde (pusuladan
  // önce) işaretlendiği için pusulaya gelen herkeste dolu olur, açılışı yutardı.
  const ad = (kisi?.full_name ?? "").trim().split(/\s+/)[0] || "";
  const acilisGoster = !durum.onceliklerVar;

  return (
    <PusulaGiris ad={ad} goster={acilisGoster}>
      <PusulaSohbet
        baslangic={gecmis}
        rizaVar={!!kisi?.consent_at}
        onceliklerVar={durum.onceliklerVar}
        oncelikler={oncelikler}
        asamaBaslangic={durum.asama}
      />
    </PusulaGiris>
  );
}
