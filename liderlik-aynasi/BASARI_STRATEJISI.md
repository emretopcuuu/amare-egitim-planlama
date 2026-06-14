# Başarı Stratejisi — "İlk 72 Saat" damıtması

Liderlerin yıllar önce yazdığı *İlk 72 Saat* el kitabından damıtılan, sahada
işleyen **doğrudan-satış / tavsiye-ticareti tekniği**. AYNA'nın ürettiği görev,
koçluk ve sorular bu yöntemle konuşsun diye `lib/basariStratejisi.ts`
(`BASARI_STRATEJISI`) sabitine kondu ve runtime AI promptlarına enjekte edildi.

> **Marka temizliği (zorunlu):** Kaynak kitap belirli bir markaya (ve onun ürün
> adlarına, kazanç planına, kariyer-isimlerine) bağlı yazılmıştı. Bu damıtma ve
> `basariStratejisi.ts` **hiçbir marka/ürün/şirket adı, kazanç iddiası veya
> kariyer-ismi içermez**; AYNA da bunları asla üretmez. Yalnız markadan bağımsız,
> evrensel teknik tutulur. Kitabın ham metni repoya **commit edilmedi**.

> **Guardrail:** Bu bir KAYNAKTIR — persona ve çıktı kurallarının önüne geçmez.
> Manipülasyon yok; dürüstlük + empati her şeyin önünde; klinik/travma alanına
> inilmez.

## Neden bu kaynak sistemi doğruluyor

Kitabın omurgası, kamp öncesi anketten çıkan engel haritasıyla ve kurduğumuz
fazlarla neredeyse birebir örtüşüyor:

| Kitaptaki ilke | Sistemde karşılığı | Anketteki engel |
|---|---|---|
| **72 Saat Yasası** — motivasyon ~72 saatte düşer (gün1 zirve, gün3 unutuş), sonra irade→alışkanlık (~40 gün tekrar) | FAZ 2 İlk 72 Saat re-entry + churn bakımı + 90 gün motor; "4. gün çöküşü" | motivasyon kaybı, istikrar |
| **Pozitif Momentum**: İnanç→Potansiyel→Eylem→Sonuç→İnanç | Fun Failure + görünür ilerleme + Fiero | harekete geçememe |
| **Nedenleri bulmak** (gökdelen; "neden engelden büyükse devam"); **köpürtmek** | Pusula FAZ 0 + nüks anında yeni cümleyi geri çalma | nedenleri netleştirememe |
| **Hayır eşiği** ("evet derlerse yapacaklarına hayır derler"); red = veri | Reddi Kutla / go-for-no (FAZ 3) | red/hayır korkusu (#2) |
| **Prestij/kimlik eşiği** ("prestij sensin"); kurumsal zırh | Boşluk Anı iç-engel çürütme | prestij eşiği, network algısı |
| **Kontak listesi** (piyangocu/amatör/profesyonel; her gün +3) | yolculuk görevleri | liste/kontak tükenmesi (#3) |
| **Isınma %51 / feel-felt-found / kapanış 1-10** | simülasyon görev + koçluk puanlama | davet, kapanış, itiraz |
| **Eklemeden katlamaya** ("kopyalanabilir olan önemli") | takım kırılımı / cascade (FAZ 5) | katlama, lider yetiştirme |
| **5 saniye kuralı**; üşenme-erteleme-vazgeçme | görev "şimdi yap" tetikleri | erteleme/başlayamama (#7) |

## Damıtılmış teknikler (kaynak metnin özü)

1. **Pozitif Momentum döngüsü** — küçük eylem → görünür sonuç → büyüyen inanç.
2. **72 Saat Yasası** — güçlü başlangıç → İRADE (sözü başkasına ver = sosyal
   taahhüt) → ALIŞKANLIK (21–60, ~40 gün tekrar = "beyni programlama").
3. **Neden** — para yüzeysel; güçlü neden imkansızı göze aldırır; karar/nüks
   anında köpürt.
4. **Dört eşik** — yakın çevre / internet / prestij-kimlik / hayır.
5. **Reddi çerçevele** — "insanlar sana değil, evet derlerse yapacaklarına hayır
   der"; red = veri. Avcı psikolojisinden çık.
6. **Kontak listesi** — profesyonel her gün +3; başkası adına karar verme.
7. **Davet** — kısa (<2 dk, amaç masaya oturtmak), merak+fayda+samimiyet;
   telefonda işi anlatma; empati ("bana böyle yaklaşılsa kabul eder miydim?").
8. **Isınma = %51** — soru sor, dinle, ihtiyacı masaya döktür; ihtiyaç yoksa
   sunum yok.
9. **İlk adımı tecrübeliyle at + kademeli devir**; "ekleme değil katlama; önemli
   olan kopyalanabilir olan".
10. **İtiraz karşılama** — feel-felt-found (Anlıyorum/Hissettim/Keşfettim) + dört
    soru (min kazanç? ne zaman? günde kaç saat? → "%100 emin olsan yolunu
    bulurdun").
11. **Kapanış** — "Hadi başlayalım?" tempo testi; 1–10 ("kaçtasın?"), 1 dışında
    her puanı kabul et, "+2 için nasıl yardım edebilirim?"; **ısrar = taciz**.
12. **Takip** — "düşüneyim" normaldir; randevuyu masada netleştir; "şimdilik
    hayır"a kapı açık; ısrar etme.
13. **Başlama tetiği** — 5 saniye kuralı (5-4-3-2-1, hemen ilk hareket).
14. **İlkeler** — dürüstlük+samimiyet, empati (#1 beceri), iyilik/fayda çerçevesi
    (epik anlam), "gelirin kişisel gelişimini geçemez".

## Bunu sistem nasıl kullanıyor (çalışan entegrasyon)

`BASARI_STRATEJISI` sabiti şu AI promptlarına enjekte edildi:

- **AYNA görev üretimi** (`lib/ayna.ts` `gorevUret`) — görevler bu saha
  tekniğinde konuşur; özellikle yolculuk modunda davet/ısınma/kapanış/go-for-no
  adımlarını üretir.
- **AYNA puanlama/koçluk** (`lib/ayna.ts` `gorevPuanla`) — simülasyon koçluğu
  feel-felt-found, ısınma, tempo, 1–10, ısrar=taciz çerçevesine dayanır.
- **Pusula nedenler sohbeti** (`lib/pusula.ts`) — "nedenleri bulmak" ve "eşikler"
  yöntemi doğrudan bu kitaptan; sohbet kişinin gerçek nedenini ve iç engelini bu
  çerçeveyle kazır.

Birlikte: `KATILIMCI_EVRENI` (problem katmanı — ne ile tıkanıyorlar) +
`BASARI_STRATEJISI` (çözüm katmanı — sahada ne işe yarıyor) + Pusula (kişisel
neden) = AYNA'nın ürettiği her şey hem onların dilinde hem işleyen teknikte.
