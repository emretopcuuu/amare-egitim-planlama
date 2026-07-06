// KİŞİ KİMLİĞİ — katılımcının KENDİ cinsiyeti + yaşı, tek noktadan yönetilen
// yardımcı. Amaç: her AI motoru (görev, mektup, koç, ikinci ayna, oyun planı…)
// aynı hitap/ton kuralını sistem promptuna eklesin — kadına "baba" denmesin,
// dil yaşa göre ayarlansın. Motorlar `participants`'tan cinsiyet+yas çekip
// `kimlikBlogu(...)` çıktısını sistem promptunun sonuna ekler.

import type { Db } from "@/lib/degerlendirme";

export type Cinsiyet = "kadin" | "erkek" | "diger";

// DB'den gelen ham değeri güvenli Cinsiyet'e indirger (beklenmeyen değer → null).
export function cinsiyetNormalize(ham: string | null | undefined): Cinsiyet | null {
  return ham === "kadin" || ham === "erkek" || ham === "diger" ? ham : null;
}

// Sistem promptuna eklenecek hitap/ton bloğu. Cinsiyet/yaş yoksa da güvenli bir
// nötr kural döner (asla cinsiyet varsayma). Boş string DÖNMEZ — her zaman en az
// "cinsiyet varsayma" güvencesini verir, çünkü asıl şikâyet buydu (kadına "baba").
export function kimlikBlogu(
  cinsiyetHam: string | null | undefined,
  yas: number | null | undefined
): string {
  const c = cinsiyetNormalize(cinsiyetHam);
  const satirlar: string[] = [];

  if (c === "kadin") {
    satirlar.push(
      "Bu kişi bir KADIN. Ona ASLA erkeğe özgü hitap kullanma: 'baba', 'kardeşim' (erkek çağrışımlı), 'reis', 'aslanım', 'koçum', 'kaptan', 'abi' YASAK. Dişil ya da nötr, saygılı bir hitap seç (adıyla seslen, 'dostum', 'yol arkadaşım')."
    );
  } else if (c === "erkek") {
    satirlar.push(
      "Bu kişi bir ERKEK. Ona kadına özgü hitap ('abla', 'kardeşim' [kadın çağrışımlı]) kullanma; adıyla ya da nötr/eril hitap et."
    );
  } else {
    satirlar.push(
      "Bu kişinin cinsiyeti belirtilmemiş. Cinsiyet VARSAYMA; cinsiyete bağlı hitaplardan (baba, abla, reis, aslanım…) kaçın, adıyla ya da nötr hitap et ('dostum', 'yol arkadaşım')."
    );
  }

  if (typeof yas === "number" && Number.isFinite(yas) && yas > 0) {
    satirlar.push(
      `Yaşı ${yas}. Dilini, örneklerini, referanslarını ve tonunu bu yaşa uygun kur (genç biriyle 20'lerin, olgun biriyle 50'lerin diliyle konuşma dengesini gözet).`
    );
  }

  return `\n\nKİŞİ HİTABI ( zorunlu kural): ${satirlar.join(" ")}`;
}

// DB'den kişinin cinsiyet+yaşını çekip doğrudan sistem-prompt bloğu döner.
// Motorlar tek satırla ekler: `system: \`...${await kimlikBloguGetir(db, pid)}\``.
// Sorgu/kayıt yoksa güvenli nötr blok döner (asla patlamaz).
export async function kimlikBloguGetir(db: Db, pid: string): Promise<string> {
  try {
    const { data } = await db
      .from("participants")
      .select("cinsiyet, yas")
      .eq("id", pid)
      .maybeSingle();
    return kimlikBlogu(data?.cinsiyet ?? null, data?.yas ?? null);
  } catch {
    return kimlikBlogu(null, null);
  }
}
