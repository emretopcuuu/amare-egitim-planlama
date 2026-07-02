import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { odevPaketiGonder } from "@/lib/odevPaketi";

type Db = ReturnType<typeof supabaseAdmin>;

// FAZ 2 — Kamp sonrası orkestratör fonksiyonları. Sabit temalı ödev/mikro
// görevleri tüm katılımcılara düşürür (kind="odev"). Orkestratör FONKSIYONLAR
// kaydından çağrılır (senaryo satırı eylem_tipi='fonksiyon').

// [2.2] 72 SAAT PROTOKOLÜ — 21-23 Temmuz, günde 1 mikro görev, sabit tema.
export async function p72Gun1(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Sözünü sesli oku",
    govde:
      "Kampta mühürlediğin sözü aç. Ekibinden ya da ailenden bir kişiye onu SESLİ oku — sadece oku, savunma. Sonra bana tek cümleyle yaz: okurken ne hissettin?",
    gunSonra: 1,
  });
}

export async function p72Gun2(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Salondaki davetin devamı",
    govde:
      "Kampın son günü bir isme davet çıkarmıştın. Bugün o kişiye tekrar dokun: randevuyu NETLEŞTİR — gün ve saat belirle. Olmadıysa da sorun değil; bana ne olduğunu yaz.",
    gunSonra: 1,
  });
}

export async function p72Gun3(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Kamp arkadaşınla 10 dakika",
    govde:
      "Bugün kamptan bir arkadaşını ara — 10 dakika, planlarını değil hâlinizi konuşun. Kapattıktan sonra bana bir cümle yaz: konuşmak sana ne yaptı?",
    gunSonra: 1,
  });
}

// [2.4] ÖDEV PAKETLERİ — göreli günlerde otomatik düşen sabit paketler.
export async function odev10Gun(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "10. Gün: İlk sonuç",
    govde:
      "Kampından bu yana 10 gün geçti. Attığın en somut adımı ve ondan çıkan tek gerçek sonucu (küçük de olsa) yaz. Sonuç yoksa: hangi adımı bugün atacaksın?",
    gunSonra: 3,
  });
}

export async function odev15Gun(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "15. Gün: Ritim kontrolü",
    govde:
      "İki haftadır sahadasın. Hangi alışkanlık tuttu, hangisi kaydı? Bir cümlede tut, bir cümlede düzelt — bu hafta neyi değiştireceksin?",
    gunSonra: 3,
  });
}

export async function agustosOdev(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Ağustos: Katlama ayı",
    govde:
      "Ağustos katlama ayın. Bu ay tek bir kişiyi 'kopyalanabilir' hale getirmeye odaklan: kime, neyi öğreteceksin? İlk adımı yaz.",
    gunSonra: 5,
  });
}
