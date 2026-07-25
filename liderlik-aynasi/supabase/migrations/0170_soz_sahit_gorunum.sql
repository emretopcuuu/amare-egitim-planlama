-- SÖZ ŞAHİT GİZLİLİĞİ — bir söze şahit gösterilen kişi, şu ana kadar sözün TAM
-- metnini görüyordu; o metin AI tarafından kişinin çekirdek nedeni, iç engeli,
-- gelir/rütbe hedefi ve kör noktasından dokunuyor → mahrem "gerçek neden" şahide
-- sızıyordu (saha bildirimi). Artık kişi her sözünde seçer:
--   'sade' (varsayılan): şahit, AI'nin yumuşattığı onurlu tek-iki cümle neden
--          (RAKAM yok, yara yok, zayıflık etiketi yok) + 90 gün adımlarını görür.
--   'tam' : şahit sözün tam metnini görür (kişi bilinçli açarsa).
-- sahit_metin: şekillendirme anında üretilen sade (şahide gidecek) sürüm.
alter table soz add column if not exists sahit_gorunum text not null default 'sade';
alter table soz add column if not exists sahit_metin text;

-- MEVCUT sözler olduğu gibi (tam) kalsın — geriye dönük sürpriz gizleme yok;
-- kişi isterse kendi kısar. Yalnız BUNDAN SONRAKİ sözler varsayılan 'sade'.
update soz set sahit_gorunum = 'tam';
