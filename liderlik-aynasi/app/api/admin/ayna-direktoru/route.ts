import { headers } from "next/headers";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SOZ_GOREVI } from "@/lib/ayna";
import { gorevSeslendir } from "@/lib/yansima";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// AYNA Kontrol Odası eylemleri: uyandır/durdur, tempo, manuel tik, SÖZ finali.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { islem?: unknown; aktif?: unknown; tempo?: unknown; mod?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.aynaDirektor.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  if (govde.islem === "durum" && typeof govde.aktif === "boolean") {
    await db
      .from("settings")
      .upsert({ key: "ayna_aktif", value: String(govde.aktif), updated_at: simdi });
    if (govde.aktif) {
      // Kamp günü sayacı ilk uyanışta başlar
      const { data } = await db
        .from("settings")
        .select("key")
        .eq("key", "ayna_baslangic")
        .maybeSingle();
      if (!data) {
        await db
          .from("settings")
          .upsert({ key: "ayna_baslangic", value: simdi, updated_at: simdi });
      }
    }
    return Response.json({ ok: true });
  }

  if (
    govde.islem === "tempo" &&
    typeof govde.tempo === "string" &&
    ["surpriz", "2", "3"].includes(govde.tempo)
  ) {
    await db
      .from("settings")
      .upsert({ key: "ayna_tempo", value: govde.tempo, updated_at: simdi });
    return Response.json({ ok: true });
  }

  if (
    govde.islem === "mod" &&
    typeof govde.mod === "string" &&
    ["kamp", "yolculuk"].includes(govde.mod)
  ) {
    await db
      .from("settings")
      .upsert({ key: "sistem_modu", value: govde.mod, updated_at: simdi });
    if (govde.mod === "yolculuk") {
      // Yolculuk başlangıcı bir kez yazılır; tekrar başlatmak sayacı sıfırlar
      await db
        .from("settings")
        .upsert({ key: "yolculuk_baslangic", value: simdi, updated_at: simdi });
    }
    return Response.json({ ok: true, mod: govde.mod });
  }

  if (govde.islem === "tik") {
    const gizli = process.env.AYNA_TIK_SECRET;
    if (!gizli) {
      return Response.json(
        { hata: "AYNA_TIK_SECRET tanımlı değil — Vercel ortam değişkenlerine ekle." },
        { status: 503 }
      );
    }
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const res = await fetch(`${proto}://${host}/api/tik`, {
      method: "POST",
      // Test tiki sessiz saati yok sayar — admin gece de prova yapabilsin
      headers: { "x-ayna-anahtar": gizli, "x-ayna-test": "1" },
    });
    const veri = await res.json().catch(() => null);
    if (!res.ok) {
      return Response.json({ hata: tr.admin.aynaDirektor.hata }, { status: 502 });
    }
    return Response.json(veri);
  }

  if (govde.islem === "soz") {
    const [{ data: kisiler }, { data: mevcutSozler }] = await Promise.all([
      db.from("participants").select("id").eq("role", "participant"),
      db.from("missions").select("participant_id").eq("kind", "soz"),
    ]);
    const sozluler = new Set((mevcutSozler ?? []).map((m) => m.participant_id));
    const hedefler = (kisiler ?? []).filter((k) => !sozluler.has(k.id));
    const dueAt = new Date(Date.now() + 12 * 3_600_000).toISOString();

    for (const k of hedefler) {
      const { data: yeniGorev, error } = await db
        .from("missions")
        .insert({
          participant_id: k.id,
          kind: SOZ_GOREVI.kind,
          title: SOZ_GOREVI.title,
          body: SOZ_GOREVI.body,
          due_at: dueAt,
        })
        .select("id")
        .single();
      if (!error && yeniGorev) {
        await katilimciyaBildir(db, k.id, `🤝 ${SOZ_GOREVI.title}`, SOZ_GOREVI.body);
        // SÖZ kampın tek seferlik anı: günlük fısıltı tavanından muaf
        await gorevSeslendir(
          db,
          k.id,
          yeniGorev.id,
          SOZ_GOREVI.title,
          SOZ_GOREVI.body,
          true
        );
      }
    }
    return Response.json({ gonderilen: hedefler.length });
  }

  return Response.json({ hata: tr.admin.aynaDirektor.hata }, { status: 400 });
}
