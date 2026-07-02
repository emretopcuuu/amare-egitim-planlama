import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";

type Db = ReturnType<typeof supabaseAdmin>;

// FAZ 2.4 — ÖDEV PAKETİ: tüm katılımcılara yapılandırılmış bir ödev (kind="odev")
// düşürür + herkese push. Hem admin "Ödev Gönder" ucu hem orkestratör (10/15 gün,
// Ağustos paketleri) AYNI fonksiyonu çağırır — tek doğruluk kaynağı.
export async function odevPaketiGonder(
  db: Db,
  opts: { baslik: string; govde: string; gunSonra?: number }
): Promise<number> {
  const baslik = opts.baslik.trim().slice(0, 120);
  const govde = opts.govde.trim().slice(0, 1000);
  const gun = Math.min(60, Math.max(1, opts.gunSonra ?? 7));
  if (!baslik || !govde) return 0;

  const { data: kisiler } = await db.from("participants").select("id").eq("role", "participant");
  if (!kisiler?.length) return 0;

  const due = new Date(Date.now() + gun * 86_400_000).toISOString();
  const satirlar = kisiler.map((k) => ({
    participant_id: k.id,
    kind: "odev",
    title: baslik,
    body: govde,
    difficulty: 2,
    due_at: due,
  }));
  const { error } = await db.from("missions").insert(satirlar);
  if (error) return 0;

  await herkeseBildir(
    db,
    `📋 Yeni ödev: ${baslik}`,
    govde.length > 120 ? govde.slice(0, 117) + "…" : govde,
    "/gorevler"
  );
  return satirlar.length;
}
