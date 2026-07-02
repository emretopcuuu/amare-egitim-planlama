import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";

// [M2/M3] Onboarding hatırlatması: Değerler'i bitirmemiş veya oyununu seçmemiş
// (team boş) katılımcılara neyin eksik olduğuna göre tek, net dürtü gönderir.
// katilimciyaBildir hem push'lar HEM gelen kutusuna yazar → push izni olmayan
// kişi de uygulama içinde görür. Push aboneliği olmayanlar ayrıca döndürülür ki
// admin onları WhatsApp'tan elle takip edebilsin.
const HEDEFLER = {
  degerler: {
    baslik: "Değerler çalışman yarım kaldı",
    govde: "Birkaç dakika ayır, üç temel değerini tamamla — kampa hazır gel. 💎",
    url: "/degerler",
  },
  oyun: {
    baslik: "Oyununu henüz seçmedin",
    govde: "Cumartesi oyunlarından ikisini seç, grubun belirlensin. 🎲",
    url: "/oyun-secimi",
  },
} as const;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { hedef?: string } | null;
  const hedef = body?.hedef;
  if (hedef !== "degerler" && hedef !== "oyun") {
    return Response.json({ hata: "Geçersiz hedef." }, { status: 400 });
  }
  const mesaj = HEDEFLER[hedef];

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: tamamlar }, { data: aboneler }] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    hedef === "degerler"
      ? db.from("degerler_calismasi").select("participant_id").not("tamamlandi_at", "is", null)
      : db.from("participants").select("id").eq("role", "participant").not("team", "is", null),
    db.from("push_subscriptions").select("participant_id"),
  ]);

  // Tamamlayanların id kümesi (değerler → participant_id; oyun → id).
  const tamamSet = new Set(
    (tamamlar ?? []).map((r) => ("participant_id" in r ? r.participant_id : (r as { id: string }).id))
  );
  const pushluSet = new Set((aboneler ?? []).map((a) => a.participant_id));

  const eksikler = (kisiler ?? []).filter((k) => !tamamSet.has(k.id));
  let gonderildi = 0;
  let pushsuz = 0;
  for (const k of eksikler) {
    await katilimciyaBildir(db, k.id, mesaj.baslik, mesaj.govde, mesaj.url);
    gonderildi++;
    if (!pushluSet.has(k.id)) pushsuz++;
  }

  await yazAuditLog(db, session.sub, "onboarding_hatirlat", { hedef, gonderildi, pushsuz });
  return Response.json({ ok: true, gonderildi, pushsuz });
}
