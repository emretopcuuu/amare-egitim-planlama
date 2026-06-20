-- 0043_seed_dev_ratings.sql
-- GELİŞTİRME TOHUMLARI: Ayna Eşi "Hesapla" düğmesini test etmek için
-- dev katılımcılara (111111-888888) birbirini dengeleyen sahte akran puanları.
-- Canlı prod'a deploy edilmeden önce bu migrasyon kaldırılmalıdır.
-- İdempotent: mevcut dev wave-1 puanlarını siler, yeniden yazar.

DO $$
DECLARE
  ayse    uuid; mehmet  uuid; fatma   uuid; ali     uuid;
  zeynep  uuid; mustafa uuid; emine   uuid; hasan   uuid;
  w1      smallint := 1;
BEGIN
  SELECT id INTO ayse    FROM participants WHERE login_code = '111111';
  SELECT id INTO mehmet  FROM participants WHERE login_code = '222222';
  SELECT id INTO fatma   FROM participants WHERE login_code = '333333';
  SELECT id INTO ali     FROM participants WHERE login_code = '444444';
  SELECT id INTO zeynep  FROM participants WHERE login_code = '555555';
  SELECT id INTO mustafa FROM participants WHERE login_code = '666666';
  SELECT id INTO emine   FROM participants WHERE login_code = '777777';
  SELECT id INTO hasan   FROM participants WHERE login_code = '888888';

  IF ayse IS NULL THEN
    RAISE NOTICE 'Dev katılımcılar bulunamadı, seed atlandı.';
    RETURN;
  END IF;

  -- Mevcut dev wave-1 puanlarını temizle (idempotent).
  DELETE FROM ratings
  WHERE rater_id IN (ayse, mehmet, fatma, ali, zeynep, mustafa, emine, hasan)
    AND wave = w1
    AND is_self = false;

  -- AYŞE (Kartallar) | Vizyon=9, Cesaret=9, Sorumluluk=8 | Mütevazılık=4, İletişim=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (mehmet,ayse,1,w1,7),(mehmet,ayse,2,w1,7),(mehmet,ayse,3,w1,7),(mehmet,ayse,4,w1,9),(mehmet,ayse,5,w1,4),(mehmet,ayse,6,w1,6),(mehmet,ayse,7,w1,5),(mehmet,ayse,8,w1,9),(mehmet,ayse,9,w1,8),(mehmet,ayse,10,w1,6),
    (zeynep,ayse,1,w1,7),(zeynep,ayse,2,w1,6),(zeynep,ayse,3,w1,8),(zeynep,ayse,4,w1,8),(zeynep,ayse,5,w1,5),(zeynep,ayse,6,w1,7),(zeynep,ayse,7,w1,5),(zeynep,ayse,8,w1,8),(zeynep,ayse,9,w1,9),(zeynep,ayse,10,w1,7),
    (hasan,ayse,1,w1,8),(hasan,ayse,2,w1,7),(hasan,ayse,3,w1,7),(hasan,ayse,4,w1,9),(hasan,ayse,5,w1,4),(hasan,ayse,6,w1,6),(hasan,ayse,7,w1,6),(hasan,ayse,8,w1,9),(hasan,ayse,9,w1,8),(hasan,ayse,10,w1,7);

  -- MEHMET (Şahinler) | Çalışkanlık=9, Takım=9, Pozitif=9 | Vizyon=4, Cesaret=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (ayse,mehmet,1,w1,7),(ayse,mehmet,2,w1,9),(ayse,mehmet,3,w1,7),(ayse,mehmet,4,w1,4),(ayse,mehmet,5,w1,6),(ayse,mehmet,6,w1,9),(ayse,mehmet,7,w1,7),(ayse,mehmet,8,w1,5),(ayse,mehmet,9,w1,7),(ayse,mehmet,10,w1,9),
    (ali,mehmet,1,w1,6),(ali,mehmet,2,w1,9),(ali,mehmet,3,w1,8),(ali,mehmet,4,w1,5),(ali,mehmet,5,w1,6),(ali,mehmet,6,w1,8),(ali,mehmet,7,w1,7),(ali,mehmet,8,w1,4),(ali,mehmet,9,w1,7),(ali,mehmet,10,w1,9),
    (fatma,mehmet,1,w1,7),(fatma,mehmet,2,w1,8),(fatma,mehmet,3,w1,7),(fatma,mehmet,4,w1,4),(fatma,mehmet,5,w1,7),(fatma,mehmet,6,w1,9),(fatma,mehmet,7,w1,8),(fatma,mehmet,8,w1,5),(fatma,mehmet,9,w1,8),(fatma,mehmet,10,w1,9);

  -- FATMA (Aslanlar) | Dürüstlük=9, İletişim=9, Mütevazılık=8 | Cesaret=4, Sorumluluk=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (ayse,fatma,1,w1,7),(ayse,fatma,2,w1,6),(ayse,fatma,3,w1,9),(ayse,fatma,4,w1,6),(ayse,fatma,5,w1,8),(ayse,fatma,6,w1,7),(ayse,fatma,7,w1,9),(ayse,fatma,8,w1,4),(ayse,fatma,9,w1,5),(ayse,fatma,10,w1,7),
    (mehmet,fatma,1,w1,6),(mehmet,fatma,2,w1,7),(mehmet,fatma,3,w1,9),(mehmet,fatma,4,w1,5),(mehmet,fatma,5,w1,8),(mehmet,fatma,6,w1,7),(mehmet,fatma,7,w1,9),(mehmet,fatma,8,w1,4),(mehmet,fatma,9,w1,5),(mehmet,fatma,10,w1,6),
    (hasan,fatma,1,w1,7),(hasan,fatma,2,w1,6),(hasan,fatma,3,w1,8),(hasan,fatma,4,w1,6),(hasan,fatma,5,w1,9),(hasan,fatma,6,w1,8),(hasan,fatma,7,w1,9),(hasan,fatma,8,w1,5),(hasan,fatma,9,w1,5),(hasan,fatma,10,w1,7);

  -- ALİ (Kartallar) | Örnek=9, Takım=8, Dürüstlük=9 | Vizyon=4, Pozitif=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (mehmet,ali,1,w1,9),(mehmet,ali,2,w1,7),(mehmet,ali,3,w1,9),(mehmet,ali,4,w1,4),(mehmet,ali,5,w1,7),(mehmet,ali,6,w1,8),(mehmet,ali,7,w1,6),(mehmet,ali,8,w1,7),(mehmet,ali,9,w1,7),(mehmet,ali,10,w1,5),
    (zeynep,ali,1,w1,8),(zeynep,ali,2,w1,7),(zeynep,ali,3,w1,9),(zeynep,ali,4,w1,5),(zeynep,ali,5,w1,7),(zeynep,ali,6,w1,8),(zeynep,ali,7,w1,7),(zeynep,ali,8,w1,6),(zeynep,ali,9,w1,8),(zeynep,ali,10,w1,5),
    (mustafa,ali,1,w1,9),(mustafa,ali,2,w1,7),(mustafa,ali,3,w1,8),(mustafa,ali,4,w1,4),(mustafa,ali,5,w1,6),(mustafa,ali,6,w1,9),(mustafa,ali,7,w1,7),(mustafa,ali,8,w1,6),(mustafa,ali,9,w1,7),(mustafa,ali,10,w1,5);

  -- ZEYNEP (Şahinler) | Pozitif=9, İletişim=9, Cesaret=8 | Çalışkanlık=4, Sorumluluk=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (ayse,zeynep,1,w1,6),(ayse,zeynep,2,w1,4),(ayse,zeynep,3,w1,7),(ayse,zeynep,4,w1,7),(ayse,zeynep,5,w1,6),(ayse,zeynep,6,w1,7),(ayse,zeynep,7,w1,9),(ayse,zeynep,8,w1,8),(ayse,zeynep,9,w1,5),(ayse,zeynep,10,w1,9),
    (ali,zeynep,1,w1,7),(ali,zeynep,2,w1,4),(ali,zeynep,3,w1,7),(ali,zeynep,4,w1,6),(ali,zeynep,5,w1,7),(ali,zeynep,6,w1,7),(ali,zeynep,7,w1,9),(ali,zeynep,8,w1,8),(ali,zeynep,9,w1,5),(ali,zeynep,10,w1,9),
    (fatma,zeynep,1,w1,7),(fatma,zeynep,2,w1,5),(fatma,zeynep,3,w1,7),(fatma,zeynep,4,w1,7),(fatma,zeynep,5,w1,6),(fatma,zeynep,6,w1,8),(fatma,zeynep,7,w1,8),(fatma,zeynep,8,w1,9),(fatma,zeynep,9,w1,5),(fatma,zeynep,10,w1,9);

  -- MUSTAFA (Aslanlar) | Vizyon=9, Sorumluluk=9, Örnek=8 | Takım=4, Mütevazılık=4
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (ayse,mustafa,1,w1,8),(ayse,mustafa,2,w1,7),(ayse,mustafa,3,w1,7),(ayse,mustafa,4,w1,9),(ayse,mustafa,5,w1,4),(ayse,mustafa,6,w1,4),(ayse,mustafa,7,w1,6),(ayse,mustafa,8,w1,7),(ayse,mustafa,9,w1,9),(ayse,mustafa,10,w1,7),
    (mehmet,mustafa,1,w1,8),(mehmet,mustafa,2,w1,6),(mehmet,mustafa,3,w1,7),(mehmet,mustafa,4,w1,9),(mehmet,mustafa,5,w1,5),(mehmet,mustafa,6,w1,4),(mehmet,mustafa,7,w1,6),(mehmet,mustafa,8,w1,7),(mehmet,mustafa,9,w1,9),(mehmet,mustafa,10,w1,6),
    (emine,mustafa,1,w1,9),(emine,mustafa,2,w1,7),(emine,mustafa,3,w1,8),(emine,mustafa,4,w1,9),(emine,mustafa,5,w1,4),(emine,mustafa,6,w1,4),(emine,mustafa,7,w1,7),(emine,mustafa,8,w1,8),(emine,mustafa,9,w1,9),(emine,mustafa,10,w1,7);

  -- EMİNE (Kartallar) | Mütevazılık=9, Çalışkanlık=9, Dürüstlük=8 | Vizyon=4, Cesaret=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (mehmet,emine,1,w1,7),(mehmet,emine,2,w1,9),(mehmet,emine,3,w1,8),(mehmet,emine,4,w1,4),(mehmet,emine,5,w1,9),(mehmet,emine,6,w1,7),(mehmet,emine,7,w1,7),(mehmet,emine,8,w1,5),(mehmet,emine,9,w1,7),(mehmet,emine,10,w1,7),
    (zeynep,emine,1,w1,7),(zeynep,emine,2,w1,9),(zeynep,emine,3,w1,8),(zeynep,emine,4,w1,4),(zeynep,emine,5,w1,9),(zeynep,emine,6,w1,8),(zeynep,emine,7,w1,7),(zeynep,emine,8,w1,5),(zeynep,emine,9,w1,7),(zeynep,emine,10,w1,7),
    (fatma,emine,1,w1,7),(fatma,emine,2,w1,9),(fatma,emine,3,w1,9),(fatma,emine,4,w1,5),(fatma,emine,5,w1,8),(fatma,emine,6,w1,7),(fatma,emine,7,w1,8),(fatma,emine,8,w1,4),(fatma,emine,9,w1,7),(fatma,emine,10,w1,6);

  -- HASAN (Şahinler) | Cesaret=9, Örnek=9, Sorumluluk=8 | İletişim=4, Mütevazılık=5
  INSERT INTO ratings (rater_id, target_id, trait_id, wave, score) VALUES
    (ayse,hasan,1,w1,9),(ayse,hasan,2,w1,7),(ayse,hasan,3,w1,7),(ayse,hasan,4,w1,6),(ayse,hasan,5,w1,5),(ayse,hasan,6,w1,7),(ayse,hasan,7,w1,4),(ayse,hasan,8,w1,9),(ayse,hasan,9,w1,8),(ayse,hasan,10,w1,7),
    (ali,hasan,1,w1,9),(ali,hasan,2,w1,7),(ali,hasan,3,w1,7),(ali,hasan,4,w1,7),(ali,hasan,5,w1,5),(ali,hasan,6,w1,7),(ali,hasan,7,w1,4),(ali,hasan,8,w1,9),(ali,hasan,9,w1,8),(ali,hasan,10,w1,8),
    (mustafa,hasan,1,w1,8),(mustafa,hasan,2,w1,6),(mustafa,hasan,3,w1,7),(mustafa,hasan,4,w1,6),(mustafa,hasan,5,w1,5),(mustafa,hasan,6,w1,7),(mustafa,hasan,7,w1,4),(mustafa,hasan,8,w1,9),(mustafa,hasan,9,w1,9),(mustafa,hasan,10,w1,7);

  RAISE NOTICE 'Dev ratings seed tamamlandı: 8 katılımcı × 10 özellik × 3 rater.';
END $$;
