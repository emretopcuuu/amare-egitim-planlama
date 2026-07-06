-- Katılımcının KENDİ cinsiyeti + yaşı. (ayna_ses = AYNA'nın sesi; bu ondan farklı:
-- kişinin kendi kimliği.) Amaç: tüm AI motorları doğru hitap etsin (kadına "baba"
-- dememek) ve dili/örnekleri yaşa göre ayarlasın. Onboarding'de ses ritüelinin
-- başında sorulur. İkisi de nullable — eski kayıtları/atlamayı bozmaz (additive).
alter table public.participants
  add column if not exists cinsiyet text
    check (cinsiyet is null or cinsiyet in ('kadin', 'erkek', 'diger')),
  add column if not exists yas smallint
    check (yas is null or (yas >= 13 and yas <= 120));
