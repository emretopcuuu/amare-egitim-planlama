import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  sicakListeGetir,
  sicakListeEkle,
  sicakListeDurumGuncelle,
  sicakListeSil,
} from "@/lib/sicakListe";

// #2 Sıcak liste — katılımcının kendi aday listesi. Yalnız kendi verisi.
async function pid(): Promise<string | null> {
  const s = await getSession();
  return s && s.rol === "participant" ? s.sub : null;
}

export async function GET() {
  const id = await pid();
  if (!id) return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  return Response.json({ liste: await sicakListeGetir(supabaseAdmin(), id) });
}

export async function POST(req: Request) {
  const id = await pid();
  if (!id) return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { isim?: string; aciklama?: string } | null;
  if (!b?.isim?.trim()) return Response.json({ hata: "İsim gerekli" }, { status: 400 });
  const kisi = await sicakListeEkle(supabaseAdmin(), id, b.isim, b.aciklama);
  if (!kisi) return Response.json({ hata: "Eklenemedi (liste dolu olabilir)" }, { status: 400 });
  return Response.json({ kisi });
}

export async function PATCH(req: Request) {
  const id = await pid();
  if (!id) return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { id?: number; durum?: string } | null;
  if (typeof b?.id !== "number" || !b?.durum) return Response.json({ hata: "Geçersiz" }, { status: 400 });
  const ok = await sicakListeDurumGuncelle(supabaseAdmin(), id, b.id, b.durum);
  return Response.json({ ok }, { status: ok ? 200 : 400 });
}

export async function DELETE(req: Request) {
  const id = await pid();
  if (!id) return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { id?: number } | null;
  if (typeof b?.id !== "number") return Response.json({ hata: "Geçersiz" }, { status: 400 });
  const ok = await sicakListeSil(supabaseAdmin(), id, b.id);
  return Response.json({ ok }, { status: ok ? 200 : 400 });
}
