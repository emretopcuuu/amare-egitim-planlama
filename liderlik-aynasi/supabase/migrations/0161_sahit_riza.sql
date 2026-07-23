-- ŞAHİT RIZASI — şahitlik artık tek taraflı SEÇİM değil, DAVET → KABUL/RET.
-- Söz sahibi bir lideri şahit gösterince davet "bekliyor" olur; şahit KABUL
-- edene dek gerçek şahit sayılmaz-ama-slotu tutar, REDDEDERSE slot boşalır
-- (sahibi yerine yeni birini seçer). Kabul edilen şahit imza_at ile işaretlenir.
--
-- durum:
--   'bekliyor' — davet gönderildi, şahit henüz yanıtlamadı (imza_at NULL)
--   'kabul'    — şahit kabul etti (imza_at dolu) → gerçek şahit
--   'ret'      — şahit reddetti → sahibin sayacına SAYILMAZ, yerine yeni seçilir
--
-- Yolculuk kapısı (secilenSahitSayisi) ret HARİÇ sayar: bekleyen+kabul = 5 → açılır.

alter table soz_tanik
  add column if not exists durum text not null default 'bekliyor';

-- Geriye dönük: hâlihazırda imzalı (QR ile ya da eski akışta) satırlar KABUL edilmiş
-- sayılır; imzasız satırlar davet olarak "bekliyor"da kalır.
update soz_tanik set durum = 'kabul' where imza_at is not null and durum <> 'kabul';

alter table soz_tanik drop constraint if exists soz_tanik_durum_check;
alter table soz_tanik
  add constraint soz_tanik_durum_check check (durum in ('bekliyor', 'kabul', 'ret'));

-- Şahit görünümü sorguları (bir liderin bekleyen davetleri / kabul ettikleri) için.
create index if not exists soz_tanik_witness_durum_idx on soz_tanik (witness_id, durum);
