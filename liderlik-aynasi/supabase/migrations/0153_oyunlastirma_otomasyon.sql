-- Oyunlaştırma bayraklarını kamp gününe göre otomatik açar (kullanıcı isteği:
-- "kampta her şey otomatik olsun, bir şey açmam gerekmesin"). Her açılışın
-- yanında herkese giden bir bildirim satırı da var (Kayıp Eşya hariç — o
-- kendi mit-duyurusunu lib/kayipEsya.ts turBaslat() içinde zaten gönderiyor).
--
-- Radyo Kıtlığı ve Çift Serisi BİLEREK dışarıda bırakıldı:
--   - Radyo Kıtlığı: kullanıcı istemedi.
--   - Çift Serisi: "kamp arkadaşı" gruplarına bağlı, o gruplar Gün 4'te
--     atanıyor (kamp_arkadasi_ata) — kamp içinde anlamsız, ayrı kararla
--     Gün 4 sonrasına eklenecek.

insert into kamp_senaryosu
  (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, durum, sira)
values
  -- Gün 1, 09:00 — Gizemli Sandık (en baştan açık, ilk görevlerden sürpriz birikmeye başlasın)
  ('gun1_sandik_ac', 'kamp_gorelli', 1, 9, 'ayar_ac', 'sandik_acik', null, null, 'bekliyor', 11),
  ('gun1_sandik_duyuru', 'kamp_gorelli', 1, 9, 'push', 'sandik_duyuru',
   '🎁 Gizemli Sandık açıldı!',
   'Her 3 görevi tamamladığında bir sandık hakkın doğacak. Aç ve sürprizini gör!',
   'bekliyor', 12),

  -- Gün 1, 09:00 — Elmas Buğusu (düşük riskli, sıfır suçlama; kamp başından itibaren)
  ('gun1_bugu_ac', 'kamp_gorelli', 1, 9, 'ayar_ac', 'bugu_acik', null, null, 'bekliyor', 13),
  ('gun1_bugu_duyuru', 'kamp_gorelli', 1, 9, 'push', 'bugu_duyuru',
   '💎 Elmasın canlandı',
   '24 saat hiç görev yapmazsan elmasına nazik bir hatırlatma düşecek — sadece seni özlediğini söylemek için.',
   'bekliyor', 14),

  -- Gün 1, 11:00 — Hamle Sırası (eşleşmeli görevler akışa girmeden hemen önce)
  ('gun1_hamle_ac', 'kamp_gorelli', 1, 11, 'ayar_ac', 'hamle_acik', null, null, 'bekliyor', 15),
  ('gun1_hamle_duyuru', 'kamp_gorelli', 1, 11, 'push', 'hamle_duyuru',
   '♟ Hamle Sırası açıldı',
   'Eşleşmeli görevlerde artık karşılıklılık var: sen yazınca sıra karşındakine geçer, o da yazınca ikiniz aynı anda görürsünüz.',
   'bekliyor', 16),

  -- Gün 1, 12:00 — Kayıp Eşya Bürosu (fonksiyon: bayrak + rastgele konuma tur; kendi mit-duyurusunu kendi gönderir)
  ('gun1_kayip_esya_ac', 'kamp_gorelli', 1, 12, 'fonksiyon', 'kayip_esya_baslat', null, null, 'bekliyor', 17),

  -- Gün 1, 20:00 — Kıvılcım Marketi (ilk günün kazancı birikince, akşam "harcayabilirsin" anı)
  ('gun1_market_ac', 'kamp_gorelli', 1, 20, 'ayar_ac', 'market_acik', null, null, 'bekliyor', 18),
  ('gun1_market_duyuru', 'kamp_gorelli', 1, 20, 'push', 'market_duyuru',
   '🏪 Market açıldı!',
   'Bugün kazandığın kıvılcımları harcayabilirsin — bilgi, sosyal jest, kişiselleştirme, konfor ve prestij reyonları seni bekliyor.',
   'bekliyor', 19);
