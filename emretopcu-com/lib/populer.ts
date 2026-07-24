// YouTube kanalındaki EN ÇOK İZLENEN videolar (popülerliğe göre sıralı).
// Kaynak: youtube.com/@emretopcuofficial — "En popüler" sıralaması.
// Haftalık GitHub Action (scripts/populer-video.mjs) bu listeyi tazeleyebilir;
// buradaki değerler o çalışana kadar geçerli başlangıç kümesidir.
export type PopulerVideo = { id: string; baslik: string };

export const POPULER: PopulerVideo[] = [
  { id: "gATvJlabS3o", baslik: "Sosyal Deney" },
  { id: "44FvgwJlfm4", baslik: "Çocuklar" },
  { id: "-w705hCBFuA", baslik: "Üst Frekansa Çıkmak" },
  { id: "4Yqzhzt6JF4", baslik: "Fırsatlara Açık Olun" },
  { id: "i7BKZBUYRMI", baslik: "Başarılı İnsanlar" },
  { id: "0QlPMoEyyWg", baslik: "Başarı Yolculuğu Engellerle Doludur" },
];
