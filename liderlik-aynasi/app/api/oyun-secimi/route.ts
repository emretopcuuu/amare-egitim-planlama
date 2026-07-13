import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  oyunSecimiGecerli,
  oyunlardanGruplar,
  oyunAnahtar,
  grupAdi,
  OYUN_BILGI,
  type CmtTur,
} from "@/lib/cumartesiProgrami";
import { kapaliKombolar } from "@/lib/oyunKapasite";

// Oyun seçimi → grup atama (giriş akışının "kodlu formülü"). Kişi 2 seçmeli oyun
// seçer; o ikiliyi oynayan gruplardan EN BOŞ olanına (eşitlikte rastgele) atanır.
// Idempotent: zaten grubu olan kişi yeniden atanmaz.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!oyunSecimiGecerli(body?.oyunlar)) {
    return NextResponse.json({ hata: "Tam olarak 2 oyun seçmelisin." }, { status: 400 });
  }
  const secilen = body.oyunlar as CmtTur[];

  const db = supabaseAdmin();

  // Zaten atanmışsa mevcut grubu döndür (tekrar atama yok). Bu kontrol
  // kapasite kontrolünden ÖNCE gelir — eski (belki artık kapalı) ikilisiyle
  // yeniden POST atan zaten-atanmış biri yanlışlıkla "dolu" hatası almasın.
  const { data: ben } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();
  if (ben?.team) {
    return NextResponse.json({ tamam: true, grup: ben.team, degismedi: true });
  }

  // Kombinasyon kapasitesi: admin bu ikiliyi kapattıysa (gruplar dolduysa) YENİ
  // seçim reddedilir. Zaten atanmış kişiler yukarıdaki kontrolle etkilenmez.
  const kapali = await kapaliKombolar(db);
  if (kapali.includes(oyunAnahtar(secilen))) {
    const isimler = secilen.map((o) => OYUN_BILGI[o]?.ad ?? o).join(" + ");
    return NextResponse.json(
      { hata: `${isimler} ikilisi şu an dolu. Lütfen farklı bir ikili seç.` },
      { status: 400 }
    );
  }

  const adaylar = oyunlardanGruplar(secilen);
  if (adaylar.length === 0) {
    await db.from("audit_log").insert({
      eylem: "oyun_secimi_adaysiz",
      detay: { katilimci: session.sub, secilen },
    });
    return NextResponse.json({ hata: "Bu oyun ikilisi için uygun grup yok." }, { status: 400 });
  }
  const adayAdlari = adaylar.map((g) => grupAdi(g));

  // ATOMİK ATAMA (migration 0079): seçim + yazım DB fonksiyonunda, advisory
  // lock ile sıralaşır. Eski oku-hesapla-yaz akışında eşzamanlı seçenler aynı
  // "en boş" grubu görüp tek gruba yığılabiliyordu (kamp açılış yarışı).
  const { data: atanmis, error } = await db.rpc("grup_ata", {
    p_participant: session.sub,
    p_adaylar: adayAdlari,
  });
  if (error) {
    // Teşhis için ham hatayı audit_log'a yaz (Railway loglarına erişmeden görülsün);
    // istemciye jenerik mesaj yeter, ham DB hatasını sızdırma.
    await db.from("audit_log").insert({
      eylem: "oyun_secimi_rpc_hata",
      detay: { katilimci: session.sub, secilen, adayAdlari, hata: error.message },
    });
    return NextResponse.json({ hata: "Atama yapılamadı, tekrar dene." }, { status: 500 });
  }
  if (!atanmis) {
    await db.from("audit_log").insert({
      eylem: "oyun_secimi_atama_bos",
      detay: { katilimci: session.sub, secilen, adayAdlari },
    });
    return NextResponse.json({ hata: "Bu oyun ikilisi için uygun grup yok." }, { status: 400 });
  }

  return NextResponse.json({ tamam: true, grup: atanmis });
}
