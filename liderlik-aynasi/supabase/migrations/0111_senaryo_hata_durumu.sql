-- [FAZ2] Senaryo satırı eylemi başarısız olursa şu ana kadar 'atesledi' kalıp
-- sessizce bir daha denenmiyordu (bkz. lib/orkestrator.ts catch bloğu). Ayrı
-- bir 'hata' durumu ekleniyor ki admin /admin/senaryo'dan görüp "yeniden dene"
-- diyebilsin.
alter table kamp_senaryosu drop constraint if exists kamp_senaryosu_durum_check;
alter table kamp_senaryosu add constraint kamp_senaryosu_durum_check
  check (durum in ('bekliyor', 'atesledi', 'atlandi', 'hata'));
