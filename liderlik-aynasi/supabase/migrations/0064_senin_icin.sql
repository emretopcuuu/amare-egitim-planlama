-- "SENİN İÇİN" KÖPRÜSÜ — nedeni canlı tutan elit keepsake.
-- Kişinin uğruna savaştığı insan(lar)ı (çekirdek neden) yolculuk boyunca canlı
-- tutar: AYNA, üç günde gösterdiklerini o nedene bağlayan kısa, dokunaklı bir
-- metin yazar; kişi bunu sevdiğine gönderebilir. "Neden" hiç soyutlaşmaz.
-- Kişi başına bir kez üretilir, saklanır (tek_cumle ile aynı write-once deseni).

CREATE TABLE IF NOT EXISTS senin_icin (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  metin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Derinlemesine savunma: RLS açık, sıfır policy (yalnız service-role erişir).
ALTER TABLE senin_icin ENABLE ROW LEVEL SECURITY;
