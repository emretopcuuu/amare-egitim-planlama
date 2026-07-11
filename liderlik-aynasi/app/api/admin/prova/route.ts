import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tikCalistir } from "@/lib/tik";
import {
  provaDurum,
  provaSanalSaat,
  provaBaslat,
  provaGunGec,
  provaBitir,
} from "@/lib/prova";

export const maxDuration = 60;

// PROVA KAMPI kontrolü — yalnızca admin. Eylemler:
//  baslat: Gün 1, sanal saat akmaya başlar, motor uyanır.
//  tik:    sanal saatle bir AYNA turu çalıştırır (prova ekranı düzenli poll eder).
//  gunGec: sonraki güne geç (admin onayı).
//  bitir:  provayı kapat (gerçek zamana dön).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const govde = (await req.json().catch(() => ({}))) as {
    eylem?: string;
    katilimciId?: string;
  };
  const db = supabaseAdmin();
  const simdi = new Date();

  if (govde.eylem === "baslat") {
    // GÜVENLİK KİLİDİ: katılımcı seçilmeden prova başlatılamaz — bkz.
    // lib/prova.ts provaBaslat + lib/tik.ts (tek katılımcıya sabitleme).
    const katilimciId = typeof govde.katilimciId === "string" ? govde.katilimciId.trim() : "";
    if (!katilimciId) {
      return Response.json({ hata: "Prova için bir katılımcı seçmelisin." }, { status: 400 });
    }
    const { data: kisi } = await db
      .from("participants")
      .select("id, full_name")
      .eq("id", katilimciId)
      .eq("role", "participant")
      .maybeSingle();
    if (!kisi) {
      return Response.json({ hata: "Katılımcı bulunamadı." }, { status: 404 });
    }
    await provaBaslat(db, simdi, katilimciId);
    return Response.json({ ok: true, gun: 1, katilimciAd: kisi.full_name });
  }

  if (govde.eylem === "gunGec") {
    const gun = await provaGunGec(db, simdi);
    return Response.json({ ok: true, gun });
  }

  if (govde.eylem === "bitir") {
    await provaBitir(db);
    return Response.json({ ok: true });
  }

  if (govde.eylem === "tik") {
    const durum = await provaDurum(db);
    const sanal = provaSanalSaat(durum, simdi);
    if (!sanal) return Response.json({ ok: false, aktif: false });
    const sonuc = await tikCalistir(db, sanal, true, true);
    return Response.json({
      ok: true,
      aktif: true,
      gun: durum.gun,
      sanal: sanal.toISOString(),
      sonuc,
    });
  }

  return Response.json({ hata: "Geçersiz eylem" }, { status: 400 });
}
