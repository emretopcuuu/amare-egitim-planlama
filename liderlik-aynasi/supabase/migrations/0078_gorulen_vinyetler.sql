-- GÖRÜLEN VİNYETLER — görev üretiminin açılış hikayesi (lib/liderlikVinyetleri.ts)
-- olarak kişiye gösterdiği vinyet kodlarını biriktirir. Amaç: aynı kişiye aynı
-- hikaye ASLA iki kez gösterilmesin (katılımcı isteği). gorevUret bu diziyi
-- okuyup seçimden hariç tutar, seçince buraya ekler.
alter table participants
  add column if not exists gorulen_vinyetler text[] not null default '{}';
