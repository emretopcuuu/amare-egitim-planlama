import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  oyunSecimiGecerli,
  oyunlardanGruplar,
  grupAdi,
  type CmtTur,
} from "@/lib/cumartesiProgrami";

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

  // Zaten atanmışsa mevcut grubu döndür (tekrar atama yok).
  const { data: ben } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();
  if (ben?.team) {
    return NextResponse.json({ tamam: true, grup: ben.team, degismedi: true });
  }

  const adaylar = oyunlardanGruplar(secilen);
  if (adaylar.length === 0) {
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
    // Ham DB hatasını sızdırma — jenerik mesaj yeter.
    return NextResponse.json({ hata: "Atama yapılamadı, tekrar dene." }, { status: 500 });
  }
  if (!atanmis) {
    return NextResponse.json({ hata: "Bu oyun ikilisi için uygun grup yok." }, { status: 400 });
  }

  return NextResponse.json({ tamam: true, grup: atanmis });
}
