import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { arketipBul, type Arketip } from "@/lib/arketip";

// A2 — Mühür Açılışı: kamp sonunda, onboarding'de mühürlenen söz açılır.
// "Kampa ___ olarak geldin, ___ olarak dönüyorsun" adlandırması burada üretilir.
// Tamamen kural-tabanlı (LLM yok): "geliş" kimliği kişinin KENDİNİ gördüğü
// öz-puandan, "dönüş" kimliği BAŞKALARININ gözündeki dış-puandan çıkar — Johari
// ölçeğinde bir before/after.

export type Donusum = {
  gelis: Arketip; // öz-imaj (öz puan) → "kampa nasıl geldin"
  donus: Arketip; // dış göz (dış puan) → "nasıl dönüyorsun"
  ayni: boolean; // ikisi aynı arketip mi
};

export function donusumAdlandir(
  satirlar: { ad: string; dis: number | null; oz: number | null }[]
): Donusum {
  // Geliş: yalnız öz puanla (kendini nasıl gördün)
  const gelis = arketipBul(satirlar.map((s) => ({ ad: s.ad, dis: null, oz: s.oz })));
  // Dönüş: dış göz öncelikli (başkalarının gözünde kim oldun)
  const donus = arketipBul(satirlar);
  return { gelis, donus, ayni: gelis.anahtar === donus.anahtar };
}

export async function muhurAcikMi(db: Db): Promise<boolean> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "muhur_acik")
    .maybeSingle();
  return data?.value === "true";
}
