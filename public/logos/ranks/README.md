# Rank Logoları

Bu klasöre her rank için **PNG logo** koyulur. Dosya adı **rank key**'iyle aynı olmalı:

| Dosya adı | Rank label |
|---|---|
| `brand_partner.png` | Brand Partner |
| `brand_builder.png` | Brand Builder |
| `bronze.png` | Bronze |
| `silver.png` | Silver |
| `gold.png` | Gold |
| `platinum.png` | Platinum |
| `leader.png` | Leader |
| `senior_leader.png` | Senior Leader |
| `executive_leader.png` | Executive Leader |
| `diamond.png` | Diamond |
| `one_star_diamond.png` | 1-Star Diamond |
| `two_star_diamond.png` | 2-Star Diamond |
| `three_star_diamond.png` | 3-Star Diamond |
| `presidential_diamond.png` | Presidential Diamond |

## Önerilen format

- **Boyut:** 256×256 px (kare)
- **Format:** PNG, **transparent zemin**
- **Stil:** Beyaz/sade çerçeve, açık zemin (RankIcon component beyaz cam içinde gösterir)

## Eksik logo davranışı

Dosya yoksa RankIcon component **otomatik fallback** gösterir:
- Gradient daire (rank rengiyle)
- Rank kısaltması (BP, BB, S, G, P, L, SL, EL, D, PD vb.)
- Star Diamond rank'lerinde küçük ⭐ ikonları sağ üstte (1/2/3 adet)

Yani logoları **kademeli olarak** yükleyebilirsin — eksik olanlar fallback ile çalışmaya devam eder, ekledikçe gerçek logo görünür.
