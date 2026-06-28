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
  const govde = (await req.json().catch(() => ({}))) as { eylem?: string };
  const db = supabaseAdmin();
  const simdi = new Date();

  if (govde.eylem === "baslat") {
    await provaBaslat(db, simdi);
    return Response.json({ ok: true, gun: 1 });
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
