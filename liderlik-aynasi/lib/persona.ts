// KARİYER PERSONA MOTORU — "Üç Kariyer Hâli" (A/B/C + A+).
// Pusula iç engelinin yanına ikinci bir eksen koyar: kariyer momentumu. Aynı
// unvandaki iki lider farklı ruh hâlinde olabilir. Kişinin kampa girişte yazdığı
// 4 ham veriden (şu anki / en yüksek / geçen ay kariyer + kıdem) hâl TÜRETİLİR.
//
// Bilinçli olarak 'server-only' DEĞİL ve DB'siz — saf fonksiyon. Hem sunucu
// (görev üretimi, prompt enjeksiyonu) hem de istemci/simülasyon aynı kuralı
// kullansın. Tek doğruluk kaynağı: ladder + türetme burada yaşar.

// Amare kariyer basamakları — büyüdükçe artan rütbe. star, diamond'ın üstü.
export const KARIYER_RANK: Record<string, number> = {
  leader: 1,
  senior_leader: 2,
  exec_leader: 3,
  diamond: 4,
  star: 5,
};

export const KARIYER_ETIKET: Record<string, string> = {
  leader: "Leader",
  senior_leader: "Senior Leader",
  exec_leader: "Exec. Leader",
  diamond: "Diamond",
  star: "Star",
};

// Sıralı seçenek listesi (form dropdown'ları için).
export const KARIYER_SECENEKLER = [
  "leader",
  "senior_leader",
  "exec_leader",
  "diamond",
  "star",
] as const;

export type KariyerHal = "test_edilmemis" | "duraksama" | "gerileme" | "yukselis";
export type TonAnahtari = "hazirlayici" | "dedektif" | "tanik_stratejist";

export type PersonaGirdi = {
  suanki: string | null; // participants.kariyer_seviyesi
  enYuksek: string | null; // participants.en_yuksek_kariyer
  gecenAy: string | null; // participants.gecen_ay_kariyer
  kidemAy: number | null; // participants.kidem_ay
};

export type PersonaSonuc = {
  hal: KariyerHal;
  kisaKod: "A" | "A+" | "B" | "C";
  etiket: string; // "Test Edilmemiş Lider"
  seviyeFark: number; // gerileme'de kaç kademe düştü (diğerlerinde 0)
  tonAnahtari: TonAnahtari;
};

// A (test_edilmemis) ile B (duraksama) ayrımı: bu seviyede/işte ne kadar süredir.
// 12 ay altı "henüz sınanmadı", üstü "düzlüğe saplandı". Eşik kolay değişsin.
export const KIDEM_ESIGI_AY = 12;

const META: Record<KariyerHal, { kisaKod: PersonaSonuc["kisaKod"]; etiket: string; ton: TonAnahtari }> = {
  test_edilmemis: { kisaKod: "A", etiket: "Test Edilmemiş Lider", ton: "hazirlayici" },
  yukselis: { kisaKod: "A+", etiket: "Yükselişteki Lider", ton: "hazirlayici" },
  duraksama: { kisaKod: "B", etiket: "Düzlüğe Saplanan Lider", ton: "dedektif" },
  gerileme: { kisaKod: "C", etiket: "Düşüşten Dönen Lider", ton: "tanik_stratejist" },
};

function paket(hal: KariyerHal, seviyeFark: number): PersonaSonuc {
  const m = META[hal];
  return { hal, kisaKod: m.kisaKod, etiket: m.etiket, seviyeFark, tonAnahtari: m.ton };
}

function rank(v: string | null): number | null {
  return v && KARIYER_RANK[v] ? KARIYER_RANK[v] : null;
}

// ★ ÇEKİRDEK TÜRETME. Veri yetersizse null → sistem jenerik davranışa düşer
// (yanlış etiket yapıştırmaktansa persona enjekte etme).
export function kariyerHalTuret(g: PersonaGirdi): PersonaSonuc | null {
  const suanki = rank(g.suanki);
  if (suanki === null) return null; // mevcut seviye yoksa hiç türetme

  // en yüksek bilinmiyorsa şu anki = en yüksek varsay (hiç düşmemiş kabul).
  const enYuksek = rank(g.enYuksek) ?? suanki;
  const gecenAy = rank(g.gecenAy);

  // C — düşüşten dönen: zirveden geriye gitmiş (kimlik yarası en ağır olan).
  if (enYuksek > suanki) return paket("gerileme", enYuksek - suanki);

  // A+ — aktif yükseliş: geçen aydan bu aya bir kademe çıkmış (toparlanmış da olabilir).
  if (gecenAy !== null && gecenAy < suanki) return paket("yukselis", 0);

  // A/B ayrımı kıdeme bağlı. Kıdem yoksa güvenli degrade: null (jenerik).
  if (g.kidemAy === null) return null;
  if (g.kidemAy <= KIDEM_ESIGI_AY) return paket("test_edilmemis", 0);
  return paket("duraksama", 0);
}

// Katılımcı kaydı üzerinden doğrudan türetme (DB satırı şekli).
export function kariyerHalKisidenTuret(k: {
  kariyer_seviyesi: string | null;
  en_yuksek_kariyer: string | null;
  gecen_ay_kariyer: string | null;
  kidem_ay: number | null;
}): PersonaSonuc | null {
  return kariyerHalTuret({
    suanki: k.kariyer_seviyesi,
    enYuksek: k.en_yuksek_kariyer,
    gecenAy: k.gecen_ay_kariyer,
    kidemAy: k.kidem_ay,
  });
}

// ★ PROMPT ENJEKSİYONU — AYNA'nın ürettiği her görev/mesaj bu bloğu okur.
// Persona'nın durumu, soru işareti, korkusu, hedefi, tonu ve "iç ofis"te baskın
// karakteri (Pusula iç engelinin hikâyeleştirilmiş hâli). Hâl yoksa boş string.
export function personaBlogu(p: PersonaSonuc | null): string {
  if (!p) return "";

  const ortak =
    `KARİYER MOMENTUMU — ÇOK ÖNEMLİ (Pusula iç engelinin YANINA ikinci eksen). ` +
    `Bu kişinin kariyer hâli: ${p.etiket} (${p.kisaKod}). Görev, mesaj ve özlü söz bu hâle göre seçilmeli.\n`;

  const bloklar: Record<KariyerHal, string> = {
    test_edilmemis:
      `Durum: Lider+ basamağına yeni geldi, iyi gidiyor ama henüz gerçek bir zorlukla sınanmadı.\n` +
      `Soru işareti: "İşler sarpa sarınca ne olacağım? Liderlik kasım gerçek mi, yoksa şartlar mı iyiydi?"\n` +
      `Asıl korku: Sahtelik — şişmiş güvenin bir gün patlaması.\n` +
      `İç ofis: Güvenlik Görevlisi henüz sessiz ama köşede bekliyor; CEO koltukta ama deneyimsiz.\n` +
      `Hedef: Sınanmamış ama HAZIRLANMIŞ kimlik. "Umarım yaparım" → "zorluk gelince ne yapacağımı biliyorum".\n` +
      `Ton: meydan okuyan hazırlayıcı — hafif provokatif, geleceği prova ettiren, şımartmayan. Görev: kontrollü zorluk üret (ertelenen zor konuşma, kriz senaryosu provası).`,
    yukselis:
      `Durum: Şu an aktif yükselişte — geçen aya göre bir kademe çıkmış (yeni gelmiş ya da düşüşten toparlanmış).\n` +
      `Soru işareti: "Bu ivmeyi nasıl korurum, nasıl katlarım?"\n` +
      `Asıl korku: İvmenin sönmesi, tek seferlik bir sıçrama olarak kalması.\n` +
      `İç ofis: CEO koltukta ve enerjik; iş, kazanımı kalıcı kılmak.\n` +
      `Hedef: Sıçramayı sürdürülebilir sisteme çevirmek; bir sonraki lideri yetiştirerek katlamak.\n` +
      `Ton: meydan okuyan hazırlayıcı — ivmeyi onurlandır ama "şans mıydı?" sorusunu da provoke et, sistemi kur.`,
    duraksama:
      `Durum: Lider+ basamağına geldi, sonra istediği gibi gitmedi; şimdi düz gidiyor — ne düşüyor ne çıkıyor.\n` +
      `Soru işareti: "Ne değişti? Eskiden oluyordu, şimdi neden olmuyor? Sorun bende mi, sistemde mi, ekipte mi?"\n` +
      `Asıl korku: Sessiz sönüş — fark etmeden vasata yerleşmek.\n` +
      `İç ofis: Arşiv Sorumlusu sürekli eski kayıpları masaya getiriyor; momentum dosyası tozlanmış.\n` +
      `Hedef: Sızıntıyı bulmuş, "neden"ine yeniden bağlanmış, yeni stratejiyle tırmanışa geçen lider.\n` +
      `Ton: meraklı dedektif — suçlamayan, araştıran, sızıntıyı (ben/ekip/sistem/dış koşul) birlikte arayan. Momentumu küçük ama sürekli hareketle yeniden tutuştur.`,
    gerileme:
      `Durum: Lider/senior/exec/diamond/star oldu, sonra ${p.seviyeFark} kademe düştü; ekibi toparlayamıyor.\n` +
      `Soru işareti: "Bir daha o ben olabilir miyim? Yoksa zirvem bir kazaydı da artık geçti mi?"\n` +
      `Asıl korku: Değersizlik — kimliğini kaybetmek, eski bene bir daha ulaşamamak.\n` +
      `İç ofis: Güvenlik Görevlisi alarmda, Arşiv Sorumlusu düşüş kayıtlarını döngüde oynatıyor, CEO koltuğu terk etmiş.\n` +
      `Hedef: Düşüşü kimlikten ayırmış, öz değerini rütbeden bağımsızlaştırmış, somut dönüş planıyla ve umutla çıkan lider.\n` +
      `Ton: önce ŞEFKATLİ TANIK, sonra stratejist — acıyı küçültme, atlamadan tanı, sonra plana taşı. Görev önce kimlik onarımı (rütbe ≠ değer), sonra tek kişiyle çekirdek dönüş. ÖNEMLİ: kriz/umutsuzluk dili görürsen koç olarak kal, kişiyi bir insan mentora/lidere yönlendir.`,
  };

  return ortak + bloklar[p.hal];
}

// ★ 90 GÜNLÜK YOLCULUK ODAĞI — kamp biter, kimlik 90 günde yerleşir. Her hâl
// farklı bir şeye odaklanır (Üç Kariyer Hâli belgesi: 66 gün protokolü).
// Yalnız yolculuk modunda enjekte edilir.
export function personaYolculukOdak(p: PersonaSonuc | null): string {
  if (!p) return "";
  const odak: Record<KariyerHal, string> = {
    test_edilmemis:
      "YOLCULUK ODAĞI (A): Kampta tasarladığı kontrollü zorlukları gerçek sahaya taşı; hazırlığını sına. Görev küçük ama gerçek bir riski davet etsin — beklemek değil, kendi spor salonunu kurmak.",
    yukselis:
      "YOLCULUK ODAĞI (A+): İvmeyi sürdürülebilir sisteme çevir. Görev, sıçramayı kalıcı kılan bir alışkanlık ya da bir sonraki lideri yetiştiren bir adım olsun.",
    duraksama:
      "YOLCULUK ODAĞI (B): Momentum zincirini kırmadan biriktir — her gün tek bir küçük hareket (görüşme/davet/takip), 'yaptım' zinciri. Büyük kahramanlık değil, sıkıcı süreklilik.",
    gerileme:
      "YOLCULUK ODAĞI (C): Tek kişiyle başlattığı dönüşü çekirdekten kalabalığa büyüt. Görev, ekibinde bir kişinin ışığını yeniden yakmaya ve oradan genişlemeye odaklansın. Rütbe değil, bir insanla başla.",
  };
  return odak[p.hal];
}
