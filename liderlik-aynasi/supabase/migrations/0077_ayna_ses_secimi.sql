-- AYNA SESİ SEÇİMİ — kişi AYNA'nın kendisine hangi cinsiyette sesle
-- seslendiğini seçer (onboarding'in başında, Ritüel'den önce). Varsayılan
-- 'erkek' — hiç seçim yapmamış eski katılımcılar da bu değerle çalışmaya
-- devam eder (geriye dönük uyumluluk).
alter table participants
  add column if not exists ayna_ses text not null default 'erkek'
  check (ayna_ses in ('erkek', 'kadin'));

-- Varsayılan 'erkek' ile "gerçekten seçti" ayrımı için: bu dolu değilse
-- onboarding'de seçim ekranı gösterilir (akis.ts).
alter table participants
  add column if not exists ayna_ses_secildi_at timestamptz;
