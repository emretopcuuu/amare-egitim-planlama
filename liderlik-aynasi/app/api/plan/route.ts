import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aiLimitYaniti } from "@/lib/aiLimit";
import {
  planKaydet,
  planOnayla,
  planGozdenGecir,
  PLAN_UFUKLARI,
  type PlanGirdi,
  type PlanMadde,
  type PlanUfuk,
} from "@/lib/oyunPlani";
import { planMaddesineDanis } from "@/lib/planDanisman";

// PLAN ATÖLYESİ ucu — kişinin kararları. action:
//   kaydet         → düzenlenen 4 ufku kaydet (taslak kalır)
//   onayla         → "Planım hazır" (durum onaylandi; söz açılır)
//   gozden-gecir   → onaylı planı tekrar düzenlemeye aç
//   danis          → bir madde için AYNA danışmanı (tavsiye + alternatif öneriler)

function madde(m: unknown): PlanMadde | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  const baslik = typeof o.baslik === "string" ? o.baslik : "";
  const aksiyon = typeof o.aksiyon === "string" ? o.aksiyon : "";
  const olcut = typeof o.olcut === "string" ? o.olcut : "";
  const kaynak =
    o.kaynak === "kisi" || o.kaynak === "duzenlendi" || o.kaynak === "ai" ? o.kaynak : undefined;
  return { baslik, aksiyon, olcut, kaynak: kaynak as PlanMadde["kaynak"] };
}
function ufukDizi(v: unknown): PlanMadde[] {
  return Array.isArray(v) ? v.map(madde).filter((m): m is PlanMadde => m !== null) : [];
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ durum: "hata" }, { status: 401 });
  }
  const db = supabaseAdmin();

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return Response.json({ durum: "hata" }, { status: 400 });
  }
  const action = typeof govde.action === "string" ? govde.action : "";

  if (action === "kaydet") {
    const p = (govde.plan ?? {}) as Record<string, unknown>;
    const girdi: PlanGirdi = {
      ilk_72_saat: ufukDizi(p.ilk_72_saat),
      on_gun: ufukDizi(p.on_gun),
      kirk_gun: ufukDizi(p.kirk_gun),
      doksan_gun: ufukDizi(p.doksan_gun),
    };
    const ok = await planKaydet(db, session.sub, girdi);
    return Response.json({ durum: ok ? "ok" : "hata" }, { status: ok ? 200 : 500 });
  }

  if (action === "onayla") {
    const sonuc = await planOnayla(db, session.sub);
    return Response.json(
      { durum: sonuc.ok ? "ok" : "hata", sebep: sonuc.sebep },
      { status: sonuc.ok ? 200 : 400 }
    );
  }

  if (action === "gozden-gecir") {
    const ok = await planGozdenGecir(db, session.sub);
    return Response.json({ durum: ok ? "ok" : "hata" }, { status: ok ? 200 : 500 });
  }

  if (action === "danis") {
    const limit = await aiLimitYaniti(session.sub, "plan-danis");
    if (limit) return limit;
    const ufuk = typeof govde.ufuk === "string" ? govde.ufuk : "";
    if (!PLAN_UFUKLARI.includes(ufuk as PlanUfuk)) {
      return Response.json({ durum: "hata" }, { status: 400 });
    }
    const m = madde(govde.madde);
    if (!m || (!m.baslik && !m.aksiyon)) {
      return Response.json({ durum: "hata" }, { status: 400 });
    }
    const soru = typeof govde.soru === "string" ? govde.soru : null;
    const sonuc = await planMaddesineDanis(db, session.sub, ufuk as PlanUfuk, m, soru);
    return Response.json(sonuc);
  }

  return Response.json({ durum: "hata" }, { status: 400 });
}
