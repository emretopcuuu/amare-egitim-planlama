import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { odevPaketiGonder } from "@/lib/odevPaketi";

type Db = ReturnType<typeof supabaseAdmin>;

// [5.1] EYLÜL KANIT GÖREVLERİ — Eylül "kanıt ayı": her hafta SOMUT bir iş sonucu +
// kanıtı istenir (rakam/ekran görüntüsü/isim). Amaç: 90 günü lafla değil, veriyle
// kapatmak. Orkestratör FONKSIYONLAR'dan çağrılır (senaryo satırı eylem_tipi=
// 'fonksiyon'). Mevcut ödev altyapısını kullanır (kind="odev").

export async function eylulKanit1(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Eylül · Kanıt 1: Bir rakam",
    govde:
      "Eylül kanıt ayı. Bu hafta ekibinden ya da işinden TEK bir somut rakam yaz: kaç yeni görüşme, kaç kayıt, kaç takip. Tahmin değil — gerçek sayı. Yanına da kanıtı (ekran görüntüsü/isim) hazır olsun.",
    gunSonra: 2,
  });
}

export async function eylulKanit2(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Eylül · Kanıt 2: Bir isim, bir sonuç",
    govde:
      "Bu hafta kamptan sonra dokunduğun bir kişinin adını ve o ilişkiden çıkan SOMUT sonucu yaz (randevu, kayıt, ret — hepsi sonuç). Sonuç yoksa: bu hafta hangi isme, ne için döneceksin?",
    gunSonra: 2,
  });
}

export async function eylulKanit3(db: Db): Promise<void> {
  await odevPaketiGonder(db, {
    baslik: "Eylül · Kanıt 3: Kopyalanan tek şey",
    govde:
      "Katlama ayının kanıtı: bu ay öğrettiğin ve BAŞKASININ tekrar ettiği tek şeyi yaz. Kime öğrettin, o kişi ne yaptı? Kopyalanabilir liderlik burada başlar.",
    gunSonra: 2,
  });
}
