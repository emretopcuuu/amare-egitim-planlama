/* AYNA'nın yüzü (Faz 1) — Higgsfield'da üretilmiş, uygulamaya STATİK gömülü
   maskot poz seti. Kampta hiçbir şey canlı üretilmez: bu bileşen yalnız doğru
   pozu gösterir (sıfır gecikme, sıfır üretim riski). Kaynak: public/ayna/.

   Kullanım: <AynaYuzu durum="kus" boyut={96} />
   Sunucu ve istemci bileşenlerinde çalışır (durumsuz, saf görüntü).
   Proje konvansiyonu gereği düz <img> (next/image pipeline'ı kullanılmıyor). */

export type AynaDurum =
  | "notr" // sakin, bilmiş gülümseme — varsayılan
  | "konusuyor" // anons/radyo/sohbet anları
  | "etkilenmis" // yüksek puan, fiero, barışma
  | "kus" // küslük modu (Faz 2)
  | "korkmus" // bowling running gag'i
  | "gururlu" // iddia kazanma, kendini beğenme
  | "saskin" // tahmin yanılması, rekor
  | "kutlama"; // görev tamamlama, zafer

const DOSYA: Record<AynaDurum, string> = {
  notr: "/ayna/notr.webp",
  konusuyor: "/ayna/konusuyor.webp",
  etkilenmis: "/ayna/etkilenmis.webp",
  kus: "/ayna/kus.webp",
  korkmus: "/ayna/korkmus.webp",
  gururlu: "/ayna/gururlu.webp",
  saskin: "/ayna/saskin.webp",
  kutlama: "/ayna/kutlama.webp",
};

// Ekran okuyucular için pozun tek satırlık tarifi (karakter de erişilebilir).
const TARIF: Record<AynaDurum, string> = {
  notr: "AYNA sakin gülümsüyor",
  konusuyor: "AYNA konuşuyor",
  etkilenmis: "AYNA etkilenmiş görünüyor",
  kus: "AYNA küsmüş, kollarını bağlamış",
  korkmus: "AYNA korkmuş görünüyor",
  gururlu: "AYNA gururla bakıyor",
  saskin: "AYNA şaşkın",
  kutlama: "AYNA kutlama yapıyor",
};

export default function AynaYuzu({
  durum = "notr",
  boyut = 80,
  sinif = "",
}: {
  durum?: AynaDurum;
  /** Piksel cinsinden kare kenar uzunluğu */
  boyut?: number;
  sinif?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DOSYA[durum]}
      alt={TARIF[durum]}
      width={boyut}
      height={boyut}
      loading="lazy"
      decoding="async"
      className={`select-none ${sinif}`}
      draggable={false}
    />
  );
}
