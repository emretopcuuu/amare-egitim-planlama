import { NextRequest } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevUret, istanbulSaati } from "@/lib/ayna";
import { katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";
import {
  grupAdi,
  grupNoCozumle,
  cumartesiGrupEtkinligi,
  cumartesiGrupBitenEtkinlik,
  CUMARTESI_GRUP_SAYISI,
} from "@/lib/cumartesiProgrami";

export const maxDuration = 120;

// Admin manuel tetik (Slice 3 — "İkisi birden"): bir grubu ŞİMDİ görevlendir.
// AYNA, grubun o anki Cumartesi etkinliğine özel görev üretir (David'le foto/
// soru, oyunda gözlem...). Bekleyen görevi olan üyeyi atlar (spam yok).
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return Response.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const grup = grupNoCozumle(String(body?.grup ?? ""));
  if (!grup) {
    return Response.json(
      { hata: `Grup 1–${CUMARTESI_GRUP_SAYISI} arası olmalı` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const now = new Date();
  const { saat, dakika } = istanbulSaati(now);
  const gunDk = saat * 60 + dakika;

  const cmt = cumartesiGrupEtkinligi(grup, gunDk);
  const biten = cumartesiGrupBitenEtkinlik(grup, gunDk);
  const etkinlik = cmt?.madde ?? null;
  const ipucu = cmt?.ipucu || null;

  const takim = grupAdi(grup);
  const { data: uyeler } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("role", "participant")
    .eq("team", takim);
  if (!uyeler?.length) {
    return Response.json({ hata: `${takim} için üye bulunamadı` }, { status: 400 });
  }

  // Bekleyen (pending/submitted) görevi olanları atla — üst üste yığma olmasın.
  const { data: acikGorevler } = await db
    .from("missions")
    .select("participant_id")
    .in("status", ["pending", "submitted"])
    .in(
      "participant_id",
      uyeler.map((u) => u.id)
    );
  const bekleyen = new Set((acikGorevler ?? []).map((g) => g.participant_id));
  const hedefler = uyeler.filter((u) => !bekleyen.has(u.id));

  let uretilen = 0;
  await Promise.all(
    hedefler.map(async (k) => {
      const gorev = await gorevUret(db, k, 2, saat, "kamp", etkinlik, biten, ipucu);
      if (!gorev) return;
      // #8 micro_sprint: sure_saat 0.5 = 30 dk
      const dueAt = new Date(now.getTime() + gorev.sure_saat * 3_600_000);
      const { data: yeni, error } = await db
        .from("missions")
        .insert({
          participant_id: k.id,
          trait_id: gorev.trait_id,
          kind: gorev.kind,
          title: gorev.title,
          body: gorev.body,
          difficulty: gorev.difficulty,
          neden: gorev.neden,
          micro_sprint: gorev.micro_sprint,
          due_at: dueAt.toISOString(),
        })
        .select("id")
        .single();
      if (error || !yeni) return;
      uretilen++;
      await katilimciyaBildir(
        db,
        k.id,
        `🤖 AYNA'dan yeni görev: ${gorev.title}`,
        gorev.body.length > 120 ? gorev.body.slice(0, 117) + "…" : gorev.body,
        "/gorevler"
      );
    })
  );

  await yazAuditLog(
    db,
    session.sub,
    "cumartesi_grup_gorevlendirildi",
    { grup, takim, etkinlik: etkinlik?.baslik ?? null, uretilen, atlanan: bekleyen.size },
    req
  );

  return Response.json({
    tamam: true,
    grup,
    takim,
    etkinlik: etkinlik?.baslik ?? null,
    uretilen,
    atlanan: bekleyen.size,
  });
}
