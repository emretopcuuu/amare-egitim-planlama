import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// [Şahitlik geliştirme #10] Alkışa tepki görünürlüğü — şahidin alkışı
// karşılıksız kalmasın. Kudos bir kez "teşekkür edildi" işaretlenir ve
// gönderen şahide anında bir teşekkür push'u gider.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { kudosId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof govde.kudosId !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: kudos } = await db
    .from("kudos")
    .select("id, from_id, to_id, tesekkur_edildi")
    .eq("id", govde.kudosId)
    .maybeSingle();
  if (!kudos || kudos.to_id !== session.sub) {
    return Response.json({ hata: "yetkisiz" }, { status: 403 });
  }
  if (kudos.tesekkur_edildi) {
    return Response.json({ ok: true }); // çift dokunuş — sessizce kabul
  }

  const { error } = await db
    .from("kudos")
    .update({ tesekkur_edildi: true })
    .eq("id", kudos.id)
    .eq("tesekkur_edildi", false);
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    return Response.json({ hata: "sunucu hatası" }, { status: 500 });
  }

  try {
    await katilimciyaBildir(
      db,
      kudos.from_id,
      "🙏 Teşekkür geldi",
      `${session.ad.split(" ")[0]} sana teşekkür etti.`,
      "/sahitlik"
    );
  } catch {
    // push yapılandırılmamış olabilir — teşekkür yine de işaretlendi
  }
  return Response.json({ ok: true });
}
