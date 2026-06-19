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

  // Aday gruplardaki doluluk → en boş gruba ata (dengeli; eşitlikte rastgele).
  const { data: doluluk } = await db
    .from("participants")
    .select("team")
    .eq("role", "participant")
    .in("team", adayAdlari);
  const sayim = new Map<string, number>(adayAdlari.map((a) => [a, 0]));
  for (const r of doluluk ?? []) {
    if (r.team) sayim.set(r.team, (sayim.get(r.team) ?? 0) + 1);
  }
  const enAz = Math.min(...adayAdlari.map((a) => sayim.get(a) ?? 0));
  const enBoslar = adayAdlari.filter((a) => (sayim.get(a) ?? 0) === enAz);
  const hedefGrup = enBoslar[Math.floor(Math.random() * enBoslar.length)];

  // Yarış koruması: yalnız hâlâ atanmamışsa yaz.
  const { data: yazildi, error } = await db
    .from("participants")
    .update({ team: hedefGrup })
    .eq("id", session.sub)
    .is("team", null)
    .select("team")
    .maybeSingle();
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  if (!yazildi) {
    // Eşzamanlı bir istek araya girdiyse güncel grubu döndür.
    const { data: tekrar } = await db
      .from("participants")
      .select("team")
      .eq("id", session.sub)
      .maybeSingle();
    return NextResponse.json({ tamam: true, grup: tekrar?.team ?? hedefGrup, degismedi: true });
  }

  return NextResponse.json({ tamam: true, grup: hedefGrup });
}
