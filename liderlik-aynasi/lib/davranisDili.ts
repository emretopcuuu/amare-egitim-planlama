// DAVRANIŞSAL DİL KÜTÜPHANESİ (Behavioral Blueprint, Sentez III — 5 Güçlü Cümle)
// Liderin/AYNA'nın deneyimi yeniden çerçeveleyen cümleleri. Admin bunlardan
// birini "günün cümlesi" yapar; aday ana sayfada görür. Kuru motivasyon değil,
// davranışı kodlayan dil: Fun Failure, Eustress, Epic Meaning, Ambient
// Sociability, Fiero.

export type DavranisCumlesi = {
  kategori: string;
  simge: string;
  cumle: string;
};

export const DAVRANIS_DILI: DavranisCumlesi[] = [
  {
    kategori: "Reddi Kutla (Fun Failure)",
    simge: "🎯",
    cumle:
      "Bugün aldığın 'Hayır', hedefinden uzaklaştığını değil, ona bir adım daha yaklaştığını gösterir. Reddi say, kutla — her 'hayır' bir sonraki 'evet'in yatırımıdır.",
  },
  {
    kategori: "Anlamlı Zorluk (Eustress)",
    simge: "🌊",
    cumle:
      "Zorlandığını biliyorum — ama anlamlı hiçbir şey başta kolay değildir. Bu gerilim bir engel değil, büyüdüğünün işareti; tam da akışın eşiğindesin.",
  },
  {
    kategori: "Büyük Amaç (Epic Meaning)",
    simge: "✨",
    cumle:
      "Sen sadece bir görev yapmıyorsun; göremediğin kadar büyük bir hikâyenin parçasısın. Attığın her küçük adım o hikâyeyi yazıyor.",
  },
  {
    kategori: "Yalnız Değilsin (Ambient Sociability)",
    simge: "🤝",
    cumle:
      "Şu an senin gibi yüzlerce kişi aynı yolda yürüyor; ben hepinizi görüyorum. Sen de yanındakini gör — birlikte daha uzağa gidiyoruz.",
  },
  {
    kategori: "Büyük Zafer (Fiero)",
    simge: "🏆",
    cumle:
      "Büyük zaferler kolaylıktan değil, zor anların tam ortasından geçenlerin enerjisinden doğar. Bugün küçük de olsa bir tane kazan — o his sana kalır.",
  },
];
