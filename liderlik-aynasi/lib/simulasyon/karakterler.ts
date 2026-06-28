// KAMP PROVA SİMÜLATÖRÜ — 20 sanal karakter.
// Gerçek kamptan önce tüm akışı canlandırmak için bilinçli olarak ÇEŞİTLİ
// kurulmuş bir kohort: dört persona hâli (A / A+ / B / C) dengeli dağılır,
// takım/şehir karışımı eşleştirme algoritmasını sınar, davranış arketipi her
// kişinin puanlama eğilimini ve görev yanıtı tonunu belirler.
//
// Saf veri + saf yardımcılar — DB yok, rastgelelik tohumla deterministik.
// Tek doğruluk kaynağı: sim karakterleri ve davranışları burada yaşar.

import type { PersonaSonuc } from "@/lib/persona";
import { kariyerHalKisidenTuret } from "@/lib/persona";

// Puanlama arketipi: bir kişi başkalarını nasıl puanlar?
//  comeri  → cömert (yüksek puan, az eleştiri)
//  sert    → sert (düşük puan, çok yorum)
//  tutarli → tutarlı/orta (dengeli)
//  dagink  → dağınık (geniş varyans, öngörülemez)
export type PuanArketip = "comeri" | "sert" | "tutarli" | "dagink";

// Yanıt arketipi: görevlere nasıl cevap yazar?
//  kisa     → tek cümle, mesafeli
//  derin    → düşünceli, içe dönük
//  cosukulu → enerjik, bol ünlem
//  supheci  → sorgulayan, mesafeli ama zeki
export type YanitArketip = "kisa" | "derin" | "cosukulu" | "supheci";

export type SimKarakter = {
  ad: string;
  takim: string;
  sehir: string;
  // Kariyer ham verisi → persona hâli (A/A+/B/C) bundan TÜRETİLİR.
  kariyer_seviyesi: string;
  en_yuksek_kariyer: string;
  gecen_ay_kariyer: string;
  kidem_ay: number;
  puanArketip: PuanArketip;
  yanitArketip: YanitArketip;
  // İç engel kategorisi (pusula için) — persona ile uyumlu.
  icEngel: string;
  icEngelKat: string;
  slogan: string;
};

// 20 karakter. Persona dağılımı bilinçli:
//   A  (test_edilmemiş, kıdem ≤12, hiç düşmemiş)         → 5 kişi
//   A+ (yükseliş, geçen aydan bir kademe çıkmış)          → 5 kişi
//   B  (duraksama, kıdem >12, sabit)                       → 5 kişi
//   C  (gerileme, en yüksek > şu anki)                     → 5 kişi
// Takımlar: 4 takım × ~5 kişi (eşleştirme grup-içi/grup-dışı sınanır).
export const SIM_KARAKTERLER: SimKarakter[] = [
  // ── A — Test Edilmemiş Lider (yeni, sınanmamış) ──
  { ad: "Sim · Elif Demir", takim: "Kartallar", sehir: "İstanbul", kariyer_seviyesi: "leader", en_yuksek_kariyer: "leader", gecen_ay_kariyer: "leader", kidem_ay: 4, puanArketip: "comeri", yanitArketip: "cosukulu", icEngel: "Yeterince hazır değilim, ya başaramazsam?", icEngelKat: "yetersizlik", slogan: "Hazır olmayı beklemeden başlıyorum." },
  { ad: "Sim · Burak Aydın", takim: "Şahinler", sehir: "Ankara", kariyer_seviyesi: "leader", en_yuksek_kariyer: "leader", gecen_ay_kariyer: "leader", kidem_ay: 7, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Şansım yaver gitti, gerçek liderlik bu değil.", icEngelKat: "impostor", slogan: "Şansı sisteme çeviriyorum." },
  { ad: "Sim · Zeynep Koç", takim: "Aslanlar", sehir: "İzmir", kariyer_seviyesi: "senior_leader", en_yuksek_kariyer: "senior_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 10, puanArketip: "dagink", yanitArketip: "kisa", icEngel: "Zorluk gelince çözülürüm diye korkuyorum.", icEngelKat: "belirsizlik", slogan: "Zorluğu prova ediyorum." },
  { ad: "Sim · Can Yıldız", takim: "Ejderler", sehir: "Bursa", kariyer_seviyesi: "leader", en_yuksek_kariyer: "leader", gecen_ay_kariyer: "leader", kidem_ay: 3, puanArketip: "comeri", yanitArketip: "cosukulu", icEngel: "Herkes benden emin ama ben değilim.", icEngelKat: "impostor", slogan: "Kendime de güveniyorum." },
  { ad: "Sim · Derya Şahin", takim: "Kartallar", sehir: "Antalya", kariyer_seviyesi: "senior_leader", en_yuksek_kariyer: "senior_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 11, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Hata yaparsam her şey çöker.", icEngelKat: "kontrol", slogan: "Hata da yolun parçası." },

  // ── A+ — Yükselişteki Lider (momentum aktif) ──
  { ad: "Sim · Mert Çelik", takim: "Şahinler", sehir: "İstanbul", kariyer_seviyesi: "exec_leader", en_yuksek_kariyer: "exec_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 14, puanArketip: "comeri", yanitArketip: "cosukulu", icEngel: "Bu ivme tek seferlik kalır mı?", icEngelKat: "belirsizlik", slogan: "İvmeyi sisteme bağlıyorum." },
  { ad: "Sim · Selin Arslan", takim: "Aslanlar", sehir: "Ankara", kariyer_seviyesi: "diamond", en_yuksek_kariyer: "diamond", gecen_ay_kariyer: "exec_leader", kidem_ay: 18, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Düşersem yine başa mı dönerim?", icEngelKat: "red_korkusu", slogan: "Kazanımı kalıcı kılıyorum." },
  { ad: "Sim · Kaan Öztürk", takim: "Ejderler", sehir: "İzmir", kariyer_seviyesi: "senior_leader", en_yuksek_kariyer: "senior_leader", gecen_ay_kariyer: "leader", kidem_ay: 9, puanArketip: "dagink", yanitArketip: "supheci", icEngel: "Hızlandıkça yalnızlaşıyorum.", icEngelKat: "baskasinin_onayi", slogan: "Yükselirken yanıma alıyorum." },
  { ad: "Sim · Ayşe Korkmaz", takim: "Kartallar", sehir: "Bursa", kariyer_seviyesi: "1_star_diamond", en_yuksek_kariyer: "1_star_diamond", gecen_ay_kariyer: "diamond", kidem_ay: 22, puanArketip: "comeri", yanitArketip: "cosukulu", icEngel: "Bir sonraki lideri yetiştiremezsem tıkanırım.", icEngelKat: "kontrol", slogan: "Bir sonraki lideri büyütüyorum." },
  { ad: "Sim · Emre Doğan", takim: "Şahinler", sehir: "Antalya", kariyer_seviyesi: "exec_leader", en_yuksek_kariyer: "exec_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 13, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Bu sefer şanstı diye içimden bir ses diyor.", icEngelKat: "impostor", slogan: "Sıçramayı tekrarlanabilir kılıyorum." },

  // ── B — Düzlüğe Saplanan Lider (kıdemli ama sabit) ──
  { ad: "Sim · Gül Yılmaz", takim: "Aslanlar", sehir: "İstanbul", kariyer_seviyesi: "diamond", en_yuksek_kariyer: "diamond", gecen_ay_kariyer: "diamond", kidem_ay: 30, puanArketip: "sert", yanitArketip: "supheci", icEngel: "Eskiden oluyordu, şimdi neden olmuyor?", icEngelKat: "degersizlik", slogan: "Sızıntıyı buluyorum." },
  { ad: "Sim · Tolga Kaya", takim: "Ejderler", sehir: "Ankara", kariyer_seviyesi: "exec_leader", en_yuksek_kariyer: "exec_leader", gecen_ay_kariyer: "exec_leader", kidem_ay: 26, puanArketip: "tutarli", yanitArketip: "kisa", icEngel: "Fark etmeden vasata yerleştim.", icEngelKat: "yetersizlik", slogan: "Nedenime yeniden bağlanıyorum." },
  { ad: "Sim · Pınar Acar", takim: "Kartallar", sehir: "İzmir", kariyer_seviyesi: "senior_leader", en_yuksek_kariyer: "senior_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 40, puanArketip: "sert", yanitArketip: "derin", icEngel: "Sorun bende mi, sistemde mi bilmiyorum.", icEngelKat: "belirsizlik", slogan: "Küçük ama sürekli hareket." },
  { ad: "Sim · Onur Eren", takim: "Şahinler", sehir: "Bursa", kariyer_seviyesi: "diamond", en_yuksek_kariyer: "diamond", gecen_ay_kariyer: "diamond", kidem_ay: 33, puanArketip: "dagink", yanitArketip: "supheci", icEngel: "Heyecanımı kaybettim, otomatiğe bağladım.", icEngelKat: "degersizlik", slogan: "Heyecanı yeniden tutuşturuyorum." },
  { ad: "Sim · Sibel Aksoy", takim: "Aslanlar", sehir: "Antalya", kariyer_seviyesi: "exec_leader", en_yuksek_kariyer: "exec_leader", gecen_ay_kariyer: "exec_leader", kidem_ay: 28, puanArketip: "tutarli", yanitArketip: "kisa", icEngel: "Ekibim de benimle birlikte durdu.", icEngelKat: "kontrol", slogan: "Momentumu yeniden başlatıyorum." },

  // ── C — Düşüşten Dönen Lider (zirveden gerilemiş) ──
  { ad: "Sim · Hakan Polat", takim: "Ejderler", sehir: "İstanbul", kariyer_seviyesi: "diamond", en_yuksek_kariyer: "2_star_diamond", gecen_ay_kariyer: "diamond", kidem_ay: 48, puanArketip: "sert", yanitArketip: "derin", icEngel: "Bir daha o ben olabilir miyim?", icEngelKat: "degersizlik", slogan: "Düşüş kimliğim değil." },
  { ad: "Sim · Nalan Çetin", takim: "Kartallar", sehir: "Ankara", kariyer_seviyesi: "exec_leader", en_yuksek_kariyer: "diamond", gecen_ay_kariyer: "exec_leader", kidem_ay: 36, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Zirvem bir kazaydı da artık geçti mi?", icEngelKat: "impostor", slogan: "Değerim rütbemden bağımsız." },
  { ad: "Sim · Serkan Güneş", takim: "Şahinler", sehir: "İzmir", kariyer_seviyesi: "senior_leader", en_yuksek_kariyer: "exec_leader", gecen_ay_kariyer: "senior_leader", kidem_ay: 44, puanArketip: "dagink", yanitArketip: "supheci", icEngel: "Ekibimi toparlayamıyorum, dağıldılar.", icEngelKat: "red_korkusu", slogan: "Tek kişiyle yeniden başlıyorum." },
  { ad: "Sim · Deniz Bulut", takim: "Aslanlar", sehir: "Bursa", kariyer_seviyesi: "1_star_diamond", en_yuksek_kariyer: "3_star_diamond", gecen_ay_kariyer: "1_star_diamond", kidem_ay: 55, puanArketip: "sert", yanitArketip: "kisa", icEngel: "Kimliğimi kaybettim, eski bene ulaşamıyorum.", icEngelKat: "degersizlik", slogan: "Çekirdekten geri dönüyorum." },
  { ad: "Sim · Ece Tan", takim: "Ejderler", sehir: "Antalya", kariyer_seviyesi: "diamond", en_yuksek_kariyer: "1_star_diamond", gecen_ay_kariyer: "diamond", kidem_ay: 38, puanArketip: "tutarli", yanitArketip: "derin", icEngel: "Düşüşü herkes gördü, utanıyorum.", icEngelKat: "baskasinin_onayi", slogan: "Dönüşü de görecekler." },
];

// Karakterin persona hâlini türet (A/A+/B/C). Karakter verisi tutarlı kurulduğu
// için null dönmemeli; yine de güvenli degrade.
export function simPersona(k: SimKarakter): PersonaSonuc | null {
  return kariyerHalKisidenTuret({
    kariyer_seviyesi: k.kariyer_seviyesi,
    en_yuksek_kariyer: k.en_yuksek_kariyer,
    gecen_ay_kariyer: k.gecen_ay_kariyer,
    kidem_ay: k.kidem_ay,
  });
}

// Deterministik sözde-rastgele tohum (kişi+özellik bazlı) — Math.random yerine,
// tekrar çalıştırınca aynı sonuç + saf fonksiyon kalsın.
export function tohumla(...parcalar: (string | number)[]): () => number {
  let h = 2166136261;
  const s = parcalar.join(":");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bir puanlayıcı, bir özellik için kaç puan verir? Arketip + tohum belirler.
// Öz-puan biraz daha yüksek/iyimser (kişi kendine has). 1-10 arası.
export function simPuan(
  arketip: PuanArketip,
  ozPuan: boolean,
  rnd: () => number
): number {
  // Arketip temel aralığı [min, max]
  const aralik: Record<PuanArketip, [number, number]> = {
    comeri: [7, 10],
    sert: [3, 7],
    tutarli: [5, 8],
    dagink: [2, 10],
  };
  let [min, max] = aralik[arketip];
  if (ozPuan) {
    // Öz-değerlendirme hafif iyimser ama kör nokta için bazen düşük.
    min = Math.min(10, min + 1);
    max = Math.min(10, max + 1);
  }
  return Math.round(min + rnd() * (max - min));
}

// Düşük puana (≤5) iliştirilecek kısa, arketipe uygun gözlem yorumu.
export function simYorum(arketip: PuanArketip, ozellikAd: string, rnd: () => number): string {
  const sert = [
    `${ozellikAd} konusunda tutarsız kaldığını birkaç kez gözlemledim.`,
    `${ozellikAd} tarafında daha net bir duruş bekliyordum.`,
    `Zorlandığı anlarda ${ozellikAd.toLowerCase()} geri planda kalıyor.`,
  ];
  const yumusak = [
    `${ozellikAd} alanında gelişime açık; potansiyeli görünüyor.`,
    `${ozellikAd} bazen parlıyor, bazen kayboluyor — istikrar gerek.`,
    `${ozellikAd} için biraz daha cesaret iyi gelir.`,
  ];
  const havuz = arketip === "sert" ? sert : yumusak;
  return havuz[Math.floor(rnd() * havuz.length)];
}

// Görev yanıtı metni — arketip + görev başlığına göre sentetik ama inandırıcı.
// Gerçek AYNA puanlaması (gorevPuanla) bu metni gerçek bir cevap gibi değerlendirir.
export function simYanit(
  arketip: YanitArketip,
  gorevBaslik: string,
  rnd: () => number
): string {
  const kalip: Record<YanitArketip, string[]> = {
    kisa: [
      `Yaptım. ${gorevBaslik} için bir kişiyle konuştum, kısa ama net oldu.`,
      `Tamamladım. Beklediğimden zorlamadı, üstesinden geldim.`,
      `Denedim ve oldu. Fazla söze gerek kalmadı.`,
    ],
    derin: [
      `Bu görev bana aslında ne kadar geri çekildiğimi gösterdi. ${gorevBaslik} sırasında içimdeki sesi fark ettim; yine de adımı attım ve sonrasında garip bir hafiflik hissettim.`,
      `Önce direndim. ${gorevBaslik} beni tam da kaçındığım yere itti. Yaparken ellerim titredi ama bitince anladım: korktuğum şey aslında bu kadar büyük değilmiş.`,
      `${gorevBaslik} üzerine düşününce, bunu yıllardır ertelediğimi gördüm. Bugün küçük de olsa gerçek bir adım attım ve bunu not etmek istiyorum.`,
    ],
    cosukulu: [
      `İnanılmazdı! ${gorevBaslik} için harekete geçtim ve karşımdaki kişinin yüzündeki değişimi görmek müthişti! Enerjim tavan yaptı 🔥`,
      `Bayıldım bu göreve! Hemen yaptım, hiç düşünmeden daldım ve çok iyi geldi. Bir tane daha ister misin diye soracağım neredeyse!`,
      `${gorevBaslik} tam bana göreydi! Coşkuyla yaptım, ekibe de bulaştırdım, ortam bir anda canlandı.`,
    ],
    supheci: [
      `${gorevBaslik} mantıklıydı ama emin değilim gerçekten fark yaratıyor mu. Yine de yaptım; sonucu ölçmek için biraz zaman lazım.`,
      `Açıkçası önce gereksiz geldi. ${gorevBaslik} yaparken "bu beni nereye götürüyor?" diye sordum. Yaptım, kısmen işe yaradı, kalanını göreceğiz.`,
      `Yaptım ama sorgulayarak. ${gorevBaslik} klasik bir egzersiz gibi durdu; ben kendi yöntemimle uyarladım, öyle daha anlamlı geldi.`,
    ],
  };
  const havuz = kalip[arketip];
  return havuz[Math.floor(rnd() * havuz.length)];
}
