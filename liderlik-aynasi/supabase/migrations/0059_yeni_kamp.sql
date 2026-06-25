-- #4 — YENİ KAMP HAZIRLA (güvenli sıfırlama). Tek transaction'da tüm katılımcı
-- verisini ve kamp durumunu temizler; YAPI (özellikler/traits, dalga satırları,
-- admin hesabı) korunur. Tam çoklu-kamp (camp_id) ayrı bir projedir; bu, owner'ın
-- aynı kurulumla ikinci bir kamp başlatabilmesi için pratik sıfırlamadır.
--
-- Yalnız sunucudan service-role ile çağrılır (API admin oturumu + onay ister).

CREATE OR REPLACE FUNCTION public.yeni_kamp_hazirla()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Önce çocuk/veri tabloları (FK güvenliği için katılımcılardan önce).
  DELETE FROM public.gorev_tanik;
  DELETE FROM public.mentorluk_kayit;
  DELETE FROM public.missions;
  DELETE FROM public.ratings;
  DELETE FROM public.assignments;
  DELETE FROM public.kudos;
  DELETE FROM public.pusula_mesajlar;
  DELETE FROM public.pusula;
  DELETE FROM public.hedef;
  DELETE FROM public.on_farkindalik;
  DELETE FROM public.bosluk_ani;
  DELETE FROM public.voice_profiles;
  DELETE FROM public.pledges;
  DELETE FROM public.churn_radar;
  DELETE FROM public.gunluk_checkin;
  DELETE FROM public.momentum_scores;
  DELETE FROM public.soz_takip;
  DELETE FROM public.mirror_letters;
  DELETE FROM public.photos;
  DELETE FROM public.redler;
  DELETE FROM public.login_attempts;

  -- Katılımcılar (admin/yardımcı hesaplar KORUNUR).
  DELETE FROM public.participants WHERE role = 'participant';

  -- Dalgaları kapat (yapı korunur, durum sıfırlanır).
  UPDATE public.waves SET is_open = false, opened_at = NULL, closed_at = NULL;

  -- Kamp durum/geçit ayarlarını ve günlük tetik bayraklarını temizle.
  DELETE FROM public.settings WHERE
    key IN (
      'reports_visible','muhur_acik','pusula_acik','on_farkindalik_acik',
      'oyun_secimi_acik','bosluk_acik','kapanis_soz_acik','ayna_aktif',
      'sonraki_dalga_zamani','gunun_cumlesi','gunun_temasi','ayna_ek_ton',
      'kapali_gorev_turleri'
    )
    OR key LIKE 'sabah_soz_%'
    OR key LIKE 'mentorluk_%'
    OR key LIKE 'fisilti_%'
    OR key LIKE 'senkron_%'
    OR key LIKE 'ortak_hatirlatma_%'
    OR key LIKE 'soz_hatirlatma_%';
END;
$$;
