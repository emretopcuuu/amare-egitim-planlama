import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kocuGecmis, kocuTuru } from "@/lib/kocu";
import { krizDiliVarMi, krizUyarisiGonder, KRIZ_YONLENDIRME } from "@/lib/guvenlik";
import { sicakAnYakala } from "@/lib/sicakAn";
import { aiLimitYaniti } from "@/lib/aiLimit";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// AYNA KOÇU — GET: sohbet geçmişi. POST: bir tur (mesaj null ise karşılama üretir).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.kocu.hata }, { status: 401 });
  }
  const gecmis = await kocuGecmis(supabaseAdmin(), session.sub);
  return Response.json({ gecmis });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.kocu.hata }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const mesaj = typeof body?.mesaj === "string" ? body.mesaj : null;

  // Maliyet sigortası: kullanıcı başına AI çağrı tavanı (bkz. lib/aiLimit.ts).
  const limit = await aiLimitYaniti(session.sub, "kocu");
  if (limit) return limit;

  const db = supabaseAdmin();

  // GÜVENLİK SINIRI: koç sohbeti serbest-metin bir duygusal yüzeydir. Gerçek
  // kriz/umutsuzluk sinyali → admin bayrağı (Presidential Diamond) + kişiye
  // insan-mentor yönlendirmesi. AYNA koç sınırında kalır; akışı bozmaz.
  const kriz = !!mesaj && krizDiliVarMi(mesaj);
  if (kriz) {
    await krizUyarisiGonder(db, session.sub, session.ad, "kocu", mesaj!);
  }

  // Özellik 3 — SICAK AN: koç sohbetindeki güçlü duygu sinyali, koç yanıtına
  // PARALEL yakalanır (fail-open, kendi hatasını yutar). Kriz metninden sıcak
  // an üretilmez — kriz akışı yukarıda ayrı işledi ve dokunulmaz.
  const sicakAnP =
    !kriz && mesaj ? sicakAnYakala(db, session.sub, "kocu", mesaj) : Promise.resolve();

  const tur = await kocuTuru(
    db,
    { id: session.sub, full_name: session.ad },
    mesaj
  );
  await sicakAnP; // serverless: yanıt dönmeden tamamlansın
  if (!tur) return Response.json({ hata: tr.kocu.uretilemedi }, { status: 503 });
  return Response.json(
    kriz ? { ...tur, mesaj: `${tur.mesaj}\n\n${KRIZ_YONLENDIRME}`, guvenlik: true } : tur
  );
}
