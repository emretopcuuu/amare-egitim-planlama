import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { sozGetir } from "@/lib/soz";
import { arketipBul } from "@/lib/arketip";
import { tlFormat } from "@/lib/kariyer";
import { KARIYER_ETIKET } from "@/lib/persona";

// GELİŞİM SENTEZİ — tek doğruluk kaynağı. Kişinin onboarding'de KENDİ BEYAN
// ettiklerini (değerler + neden + hedef + söz) kamptaki GÖZLEMLE (360° puanlar +
// yorumlar + eylemler) tek bir yapıda birleştirir.
//
// İki tüketici bunu paylaşır: (1) gelişimMektubu (AI tavsiye mektubu üretir),
// (2) Ayna Koçu (bu sentezi bilerek konuşur, boş konuşmaz). Böylece mektup ile
// koç AYNI beyni paylaşır — kişi kampta ne söylediyse, koç onu hatırlar.
//
// İLKE: eleştiri değil GELİŞİM. Ham veri burada; yorum/çerçeveleme tüketicide.

export type Sentez = {
  ad: string;
  // ── ONBOARDING: kişinin kendi beyanı ──
  degerler: { secilenUc: string[]; nedenCumlesi: string | null } | null;
  pusula: { neden: string[]; bosluk: string | null; icEngel: string | null } | null;
  hedef: { ozet: string | null; hedefMetni: string | null } | null;
  soz: { metin: string | null; durum: string } | null;
  // ── KAMP: başkalarının aynası + eylemleri ──
  ozellikler: { ad: string; oz: number | null; dis: number | null; disSayi: number }[];
  guclu: string[]; // en yüksek 3 dış algı
  gelisim: string[]; // en düşük 3 dış algı
  korNokta: { ad: string; oz: number | null; dis: number | null } | null;
  arketip: { ad: string; ozet: string } | null;
  yorumlar: string[]; // anonim yapıcı yorumlar (kimlik taşımaz)
  takdirSayisi: number;
  tamamlananGorev: number;
  // Değerlendiren sayısı yeterli mi (rapor güveni)
  yeterliVeri: boolean;
};

export async function kisiSentezi(db: Db, pid: string, ad: string): Promise<Sentez> {
  const [rapor, pusula, hedef, soz, degerlerRow, kudosSonuc] = await Promise.all([
    raporHesapla(db, pid),
    pusulaCekirdek(db, pid),
    hedefCekirdek(db, pid),
    sozGetir(db, pid),
    db
      .from("degerler_calismasi")
      .select("secilen_uc, neden_cumlesi")
      .eq("participant_id", pid)
      .maybeSingle(),
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("to_id", pid)
      .eq("is_hidden", false),
  ]);

  const secilenUc = (degerlerRow.data?.secilen_uc as string[] | null) ?? [];
  const degerler =
    secilenUc.length > 0
      ? { secilenUc, nedenCumlesi: degerlerRow.data?.neden_cumlesi ?? null }
      : null;

  // Hedef metni: kariyer planı varsa insan-okur özet ("Diamond · 250.000₺ · 12 ay")
  let hedefMetni: string | null = null;
  if (hedef?.plan) {
    const p = hedef.plan;
    const rutbe = KARIYER_ETIKET[p.rutbe as keyof typeof KARIYER_ETIKET] ?? p.rutbe;
    hedefMetni = `${rutbe} · ${tlFormat(p.gelir, p.gelirArti)} · ${p.sureAy} ay`;
  }

  const arketip = arketipBul(rapor.satirlar);

  return {
    ad,
    degerler,
    pusula: pusula
      ? {
          neden: pusula.cekirdek_neden ?? [],
          bosluk: pusula.mevcut_bosluk,
          icEngel: pusula.ic_engel,
        }
      : null,
    hedef: hedef ? { ozet: hedef.ozet, hedefMetni } : null,
    soz: soz ? { metin: soz.metin, durum: soz.durum } : null,
    ozellikler: rapor.satirlar.map((s) => ({
      ad: s.ad,
      oz: s.oz,
      dis: s.dis,
      disSayi: s.disSayi,
    })),
    guclu: rapor.guclu.map((s) => s.ad),
    gelisim: rapor.gelisim.map((s) => s.ad),
    korNokta: rapor.korNokta
      ? { ad: rapor.korNokta.ad, oz: rapor.korNokta.oz, dis: rapor.korNokta.dis }
      : null,
    arketip: arketip ? { ad: arketip.ad, ozet: arketip.ozet } : null,
    // Yorumlar anonim: yalnız metin taşınır, kim yazdığı ASLA sentezde yer almaz.
    yorumlar: rapor.yorumlar.map((y) => y.yorum).slice(0, 8),
    takdirSayisi: kudosSonuc.count ?? 0,
    tamamlananGorev: rapor.gorev?.tamamlanan ?? 0,
    yeterliVeri: !rapor.dusukGuven,
  };
}

// Sentezi AI prompt'una gömülecek kompakt, okunur bir metne çevirir.
// Hem mektup üreticisi hem koç bunu kullanır — tek biçim, tek doğruluk.
export function sentezMetni(s: Sentez): string {
  const b: string[] = [];
  b.push(`KİŞİ: ${s.ad}`);

  if (s.degerler) {
    b.push(`\n— KENDİ SEÇTİĞİ TEMEL DEĞERLER: ${s.degerler.secilenUc.join(", ")}`);
    if (s.degerler.nedenCumlesi) b.push(`  Neden cümlesi: "${s.degerler.nedenCumlesi}"`);
  }
  if (s.pusula) {
    if (s.pusula.neden.length) b.push(`\n— DERİN NEDENİ (Pusula): ${s.pusula.neden.join(" / ")}`);
    if (s.pusula.icEngel) b.push(`  İç engeli: ${s.pusula.icEngel}`);
  }
  if (s.hedef?.hedefMetni) b.push(`\n— KARİYER HEDEFİ: ${s.hedef.hedefMetni}`);
  if (s.soz?.metin) b.push(`\n— KAMPTA VERDİĞİ SÖZ: "${s.soz.metin}"`);

  // Kamp gözlemi: değer–davranış köprüsünü AI'nın kurabilmesi için puanlar.
  if (s.ozellikler.some((o) => o.dis !== null)) {
    b.push(`\n— ARKADAŞLARININ GÖZÜNDEN (10 özellik, öz→dış puan):`);
    for (const o of s.ozellikler) {
      const oz = o.oz === null ? "—" : o.oz.toFixed(1);
      const dis = o.dis === null ? "—" : o.dis.toFixed(1);
      b.push(`  • ${o.ad}: öz ${oz} → dış ${dis}`);
    }
  }
  if (s.guclu.length) b.push(`\n— EN GÜÇLÜ GÖRÜLEN: ${s.guclu.join(", ")}`);
  if (s.gelisim.length) b.push(`— EN AZ GÖRÜLEN (gelişim alanı): ${s.gelisim.join(", ")}`);
  if (s.korNokta) {
    const oz = s.korNokta.oz === null ? "—" : s.korNokta.oz.toFixed(1);
    const dis = s.korNokta.dis === null ? "—" : s.korNokta.dis.toFixed(1);
    b.push(`— KÖR NOKTA (kendini yüksek, başkaları düşük gördü): ${s.korNokta.ad} (öz ${oz} / dış ${dis})`);
  }
  if (s.arketip) b.push(`\n— LİDERLİK ARKETİPİ: ${s.arketip.ad} — ${s.arketip.ozet}`);
  if (s.yorumlar.length) {
    b.push(`\n— ARKADAŞLARININ YAZDIĞI YORUMLAR (anonim):`);
    for (const y of s.yorumlar) b.push(`  · "${y}"`);
  }
  b.push(`\n— KAMP EYLEMİ: ${s.tamamlananGorev} görev tamamladı, ${s.takdirSayisi} takdir aldı.`);
  if (!s.yeterliVeri) b.push(`(NOT: değerlendiren sayısı az — dış algıyı kesin hüküm gibi sunma.)`);

  return b.join("\n");
}
