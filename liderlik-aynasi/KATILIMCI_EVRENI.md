# Katılımcı Evreni — SAPANCA LEADER PLUS PD101

Bu belge, kampa gelen liderlerin **kamp öncesi niyet anketinden** damıtılmış
gerçek dünyasıdır. Amaç: AYNA'nın ürettiği her soru, görev, kanıt ve nudge bu
insanların **kendi dilinde** ve **gerçek tıkanma noktalarında** konuşsun —
jenerik "liderlik" klişesi değil. Çalışan özet: `lib/katilimciEvreni.ts`
(`KATILIMCI_EVRENI` sabiti, runtime AI promptlarına enjekte edilir).

> **Gizlilik (KVKK):** Bu belge ve `katilimciEvreni.ts` **kişiye özel veri
> içermez** — isim, üst lider eşlemesi veya birebir itiraf taşımaz. Yalnız küme
> düzeyinde desen tutulur. Ham anket (isimler + kişisel ifadeler) repoya
> **commit edilmedi**; gerekirse Supabase'de erişim-korumalı bir tabloda ya da
> repo dışı güvenli bir yerde tutulmalı.

## Kaynak ve yöntem

- Google Form yanıtları, kampın açılışında toplandı (Mart–Mayıs 2026).
- **168 yanıt**, **52 farklı Diamond+ üst lider** altında.
- İki kritik soru:
  1. "Amare işinin içinde ne kadar süredir aktifsiniz?"
  2. **"Şu an sizi veya takımınızdaki bir kişiyi momentuma geçmekten alıkoyan
     en somut çözümleyemediğiniz durum nedir?"** ← engel haritasının kaynağı.

### Örneklem bileşimi (kariyer)

| Kariyer | Yanıt |
|---|---|
| Leader | 98 |
| Senior Leader | 33 |
| Diamond | 22 |
| Executive Leader | 14 |
| 3 Star Diamond | 1 |

Yani kitle ağırlıklı **yeni–orta kademe lider** (Leader/Senior). Tenür çok
geniş: 38 günlükten 14 yıla kadar. Bu, görev zorluğunun ve dilin **tek tip
olmaması** gerektiğini söyler — Pusula'nın kişiselleştirmesi bu yüzden omurga.

## Engel haritası (sıklık sırasıyla)

Açık uçlu yanıtların tematik kümelenmesi (örtüşmeli; bir yanıt birden çok temaya
girebilir):

| # | Tema | ~Sıklık | Tipik ifade |
|---|---|---|---|
| 1 | **Harekete geçir(e)meme** | 19 | "İş ortaklarımı harekete geçiremiyorum", "potansiyel var ama üretim yok" |
| 2 | **Red/hayır & başarısızlık korkusu** | 17 | "ilk hayırlarında düşüyorlar", "kırılganlık", "tekrar başarısız olma" |
| 3 | **Liste/kontak tükenmesi** | 17 | "listem dağınık/taranmamış", "kontak sıkıntısı", "yeni liste oluşturmak" |
| 4 | **Sunum/üretim yapamama** | 16 | "ekipten sunum çıkaramıyorum", "sunum yapan sadece iki kişi" |
| 5 | **Davetten çekinme** | 15 | "davet ederken çekiniyorum", "rahatsız eder miyim?", "anlatmaktan çekinme" |
| 6 | **Katlama/lider yetiştirememe** | 13 | "katlamaya geçemiyoruz", "yeterli sunumcu yetiştirememek" |
| 7 | **Erteleme & başlayamama** | 11 | "sürekli erteliyorum", "başlayamıyorum", "üşengeçliğim" |
| 8 | **Konfor alanı & eşik** | 8 | "konfor alanı", "prestij eşiği", "kurumsal zırhı çıkaramıyorum" |
| 9 | **Odak/öncelik dağınıklığı** | 12 | "odak sorunu", "tek hatta kilitlenememek" |
| 10 | **Motivasyon kaybı & mental yorgunluk** | 13+3 | "motivasyonu artıramamak", "eski ve yorgun", "bıkkınlık" |
| — | İstikrar/disiplin | 7 | "istikrar ve disiplin", "süreklilik" |
| — | İnanç/güven eksikliği | 7 | "inanç", "inançsızlık" |
| — | Network algısı/önyargı | 5 | "network marketinge benzetilmesi", "beyaz yaka bakışı" |
| — | Kapanış/itiraz karşılama | 4 | "kapanışta soru sormakta zorlanıyorum" |
| — | Momentumda (engel yok) | 3 | "momentumdayız", "durum yok" |

**Okuma:** En büyük blok **eylem/üretim açığı** (1+4+7) ve hemen ardından
**ilişkisel cesaret açığı** (2+5). İkisi de davranışsaldır — sistemimizin
go-for-no (Reddi Kutla), görünür ilerleme ve churn bakımı mekanikleri tam bu
ikisini hedefler. Bu, mevcut tasarımın doğru hedefe kilitlendiğinin sahadan
doğrulamasıdır.

## Duygusal alt katman (dikkatli ele al)

Bazı yanıtlar iş-davranışının altındaki kişisel yükü açıyor: ailevi sıkıntılar,
sağlık, "hayır diyemediğim için zayıf hattı bırakıyorum", duygusal tıkanma,
tükenmişlik.

> **Guardrail:** Bunlar **klinik/terapi alanı değildir ve oraya çekilmemelidir.**
> AYNA bu kayıtta kalır: şefkatle tanı, deşme, gerçek bir insana yönlendirmeyi
> öner (Pusula persona kuralıyla birebir aynı). Sistem bunu bir **iş-davranışı**
> registerinde tutar.

## Dışsal gerçek: stok/ürün krizi

Tekrar eden ve **kişisel kusur olmayan** bir tema: ürün/stok krizleri
("Sunrise/Sunset krizi", "ürün gelmiyor", "itibar kaybı") birçok kişinin
ticaretini ve motivasyonunu gerçekten sarstı. AYNA bunu bir karakter zayıflığı
gibi çerçevelemez; **gerçek bir koşul** olarak tanır ve kişinin buna **rağmen**
attığı adımı değerli kılar. (Boşluk Anı'nda bu, kişiye karşı "kanıt" olarak
kullanılmaz.)

## Katılımcıların programa sorduğu doğrudan sorular

Anket ayrıca beklenti sinyali verdi — içerik/again tasarımında işe yarar:
- "Bizlerle bire bir görüşme olacak mı?"
- "Soğuk kontak çalışması olacak mı?"
- AI asistan davetini ekip olarak nasıl kullanırız?
- Senior/Executive Leader olmanın "dışarıdan görünür" ilk işareti ne; ona ne
  yaparak ulaşırım? (somut, ölçülebilir hedef arayışı)
- Ürün önerisi için YZ tabanlı sağlık-ihtiyaç analizi yapılabilir mi?

## İç engel kategorisi eşlemesi (`ic_engel_kat`)

Pusula damıtması ve Boşluk Anı hedeflemesi şu sezgiyle hizalanır:

| Sahadaki ifade | `ic_engel_kat` |
|---|---|
| Davetten çekinme / "rahatsız eder miyim" | `red_korkusu` |
| Prestij eşiği / statü kaybı kaygısı | `baskasinin_onayi` |
| "Ben başlatamam / yetmem" | `yetersizlik` |
| "Her şeyi kendim yapmalıyım" (devredememe) | `kontrol` |
| Başlayamama / kronik erteleme | `belirsizlik` |
| "Bu iş bana göre değil / hak etmiyorum" | `degersizlik` / `impostor` |

## Bunu sistem nasıl kullanıyor (çalışan entegrasyon)

`KATILIMCI_EVRENI` sabiti şu üç AI promptuna enjekte edildi:

- **FAZ 0 — Pusula** (`lib/pusula.ts`): Nedenler sohbeti artık bu evreni bilir;
  yüzeysel cevabı kişinin kendi diliyle ("davet", "eşik", "hayır") kazır ve
  iç engeli doğru kategoriye damıtır.
- **FAZ 1 — Boşluk Anı** (`lib/bosluk.ts`): demolisyon, engeli kişinin
  evreninin diliyle anlar; stok krizi gibi dışsal koşulu kişiye karşı kanıt
  yapmaz.
- **Görev üretimi — AYNA** (`lib/ayna.ts`): görevler jenerik değil, bu insanların
  gerçek aksiyonlarında konuşur (yolculuk modunda davet/sunum/liste/kapanış/
  go-for-no). Simülasyon itirazları artık gerçek itirazları yansıtır ("ürünler
  pahalı", "network'e benziyor", "vaktim yok", "beyaz yaka").

**Tasarım ilkesi:** Bu bir **alan bağlamıdır**, persona/çıktı kurallarının önüne
geçmez. Manipülasyon yok; neden kişinin kendi pusulasıdır; kanıt asla
uydurulmaz; klinik alana inilmez.
