-- Telefon numaralarını E.164'e zorla: kayıt yalnız +ülke kodu + 7-14 hane
-- biçiminde olabilir ya da boş olabilir. Yerel format (0532…) artık reddedilir.
-- Uygulama katmanı (lib/telefon.ts) yazma anında normalize eder; bu kısıt
-- son savunma hattıdır — herhangi bir yol atlanırsa veritabanı reddeder.
--
-- Not: Bu migration eklendiğinde mevcut yerel-format numaralar önce
-- normalize edilmişti (0XXXXXXXXXX → +90XXXXXXXXXX), böylece kısıt ihlali yok.

alter table participants
  add constraint participants_phone_e164
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
