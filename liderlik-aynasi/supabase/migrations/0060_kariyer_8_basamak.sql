-- KARİYER LADDER'I 8 BASAMAĞA GENİŞLET — One Team Global gerçek ladder'ı.
-- 0056 ladder'ı yalnız 'star'a kadar gidiyordu; gerçek ladder Leader → Presidential
-- Diamond arası 8 basamak. lib/persona.ts kod tarafında zaten 8 basamağa
-- güncellendi; bu migration olmadan DB CHECK eski 5 değere kilitli kaldığı için
-- 'presidential_diamond' vb. kayıtları "Bir şeyler ters gitti" ile reddediyordu.
--
-- Yeni ladder: leader < senior_leader < exec_leader < diamond
--            < 1_star_diamond < 2_star_diamond < 3_star_diamond < presidential_diamond

-- 1) Şu anki kariyer.
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_kariyer_seviyesi_check;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_kariyer_seviyesi_check
    CHECK (kariyer_seviyesi IN (
      'leader', 'senior_leader', 'exec_leader', 'diamond',
      '1_star_diamond', '2_star_diamond', '3_star_diamond', 'presidential_diamond'
    ));

-- 2) En yüksek kariyer.
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_en_yuksek_kariyer_check;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_en_yuksek_kariyer_check
    CHECK (en_yuksek_kariyer IN (
      'leader', 'senior_leader', 'exec_leader', 'diamond',
      '1_star_diamond', '2_star_diamond', '3_star_diamond', 'presidential_diamond'
    ));

-- 3) Geçen ayki kariyer.
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_gecen_ay_kariyer_check;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_gecen_ay_kariyer_check
    CHECK (gecen_ay_kariyer IN (
      'leader', 'senior_leader', 'exec_leader', 'diamond',
      '1_star_diamond', '2_star_diamond', '3_star_diamond', 'presidential_diamond'
    ));
