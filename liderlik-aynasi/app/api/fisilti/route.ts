import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fisiltiGonder, fisiltiAcikMi, gunlukHak } from "@/lib/fisilti";

export const maxDuration = 30;
const AZAMI_BAYT = 8 * 1024 * 1024;

// G5 — fısıltı gönder: ses (formData) sesler bucket'ına yüklenir, kayıt açılır,
// alıcıya kilitli push. Ses GERÇEK kayıt — KVKK saklama/silme kuralına tabi.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!(await fisiltiAcikMi(db))) return Response.json({ hata: "Fısıltı kapalı." }, { status: 400 });
  const { kalan } = await gunlukHak(db, session.sub);
  if (kalan <= 0) return Response.json({ hata: "Bugünlük fısıltı hakkın bitti." }, { status: 400 });

  const form = await req.formData();
  const ses = form.get("ses");
  const alici = String(form.get("alici") ?? "");
  const anonim = form.get("anonim") === "true";
  const bilirseOgrensin = form.get("bilirseOgrensin") === "true";
  if (!alici) return Response.json({ hata: "Kişi seç." }, { status: 400 });
  if (!(ses instanceof File) || ses.size === 0 || ses.size > AZAMI_BAYT) {
    return Response.json({ hata: "Ses kaydı gerekli." }, { status: 400 });
  }
  const uz = ses.type.includes("mp4") ? "mp4" : "webm";
  const yol = `fisilti/${crypto.randomUUID()}.${uz}`;
  const yuk = await db.storage.from("sesler").upload(yol, ses, { contentType: ses.type || "audio/webm", upsert: false });
  if (yuk.error) return Response.json({ hata: "Ses yüklenemedi." }, { status: 500 });

  const sonuc = await fisiltiGonder(db, session.sub, { alici, sesPath: yol, anonim, bilirseOgrensin });
  if (!sonuc.ok) {
    await db.storage.from("sesler").remove([yol]).catch(() => {});
    return Response.json({ hata: "Gönderilemedi." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
