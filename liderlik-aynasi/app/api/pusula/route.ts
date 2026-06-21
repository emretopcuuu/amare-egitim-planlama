import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaTuru, pusulaDurum, pusulaGecmis, onceliklerKaydet, pusulaSifirla } from "@/lib/pusula";
import { tr } from "@/lib/i18n/tr";

// FAZ 0 Nedenler — GET: devam (durum + geçmiş + rıza). POST: rıza / liste / tur.

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.pusula.hata }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [durum, gecmis, { data: kisi }] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
    db.from("participants").select("consent_at").eq("id", session.sub).maybeSingle(),
  ]);
  return Response.json({ durum, gecmis, rizaVar: !!kisi?.consent_at });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.pusula.hata }, { status: 401 });
  }

  let govde: { mesaj?: unknown; basla?: unknown; oncelikler?: unknown; sifirla?: unknown; sloganSec?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.pusula.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 0a) Slogan seç: kişi seçimini kaydet.
  if (typeof govde.sloganSec === "string" && govde.sloganSec.trim()) {
    await db
      .from("pusula")
      .update({ slogan: govde.sloganSec.trim().slice(0, 300) })
      .eq("participant_id", session.sub);
    return Response.json({ ok: true });
  }

  // 0) Sıfırla: kişi baştan başlamak isterse sohbet+öncelik+rızayı temizle.
  if (govde.sifirla === true) {
    await pusulaSifirla(db, session.sub);
    return Response.json({ ok: true });
  }

  // 1) Rıza: çalışma başlatılırken psikolojik veri saklama onayı.
  if (govde.basla === true) {
    await db
      .from("participants")
      .update({ consent_at: new Date().toISOString() })
      .eq("id", session.sub)
      .is("consent_at", null);
    return Response.json({ ok: true });
  }

  // 2) Öncelik listesi (madde madde form) → kaydet ve sohbeti aç.
  if (Array.isArray(govde.oncelikler)) {
    const liste = govde.oncelikler.filter((x): x is string => typeof x === "string");
    const ok = await onceliklerKaydet(db, session.sub, liste);
    if (!ok) return Response.json({ hata: tr.pusula.listeAzUyari(10) }, { status: 400 });
    const tur = await pusulaTuru(db, { id: session.sub, full_name: session.ad }, null);
    if (!tur) return Response.json({ hata: tr.pusula.aiHata }, { status: 503 });
    return Response.json(tur);
  }

  // 3) Sohbet turu (eleme → boşluk → engel).
  const mesaj =
    typeof govde.mesaj === "string" && govde.mesaj.trim() ? govde.mesaj : null;
  const tur = await pusulaTuru(db, { id: session.sub, full_name: session.ad }, mesaj);
  if (!tur) return Response.json({ hata: tr.pusula.aiHata }, { status: 503 });
  return Response.json(tur);
}
