-- "Yeni Kamp Hazırla" sıfırlamasını orkestratör (FAZ 9) çağına taşır.
-- 0069'daki yeni_kamp_hazirla() FAZ 9'dan (0091) önce yazıldığı için:
--   (a) kamp_senaryosu satırlarını 'bekliyor'a geri almıyordu → ateşlenmiş bir
--       kamptan sonra "yeni kamp" temiz başlamıyordu,
--   (b) orkestratörün açtığı bayrakları (altin_gorev_acik, eylul_kanit_modu…) ve
--       kumanda kontrollerini (orkestrator_durduruldu…) temizlemiyordu,
--   (c) FAZ 3-6'da eklenen katılımcı/eşleşme tablolarını silmiyordu.
-- Ayrıca: uyandır handler'ı ayna_baslangic'i yalnız YOKSA yazdığından, testten
-- kalan bayat bir ayna_baslangic "Kampı Başlat"ta yanlış gün sayımına yol açar.
-- Bu migration hem fonksiyonu sağlamlaştırır hem bayat değeri bir kez temizler.
create or replace function public.yeni_kamp_hazirla()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- Detay / ilişki / mesaj tabloları (ana tablolardan ÖNCE — FK güvenliği).
  delete from public.pusula_mesajlar;
  delete from public.hedef_mesajlar;
  delete from public.on_farkindalik_yanit;
  delete from public.pair_messages;
  delete from public.foto_begeni;
  delete from public.foto_yorum;
  delete from public.soz_durtme;
  delete from public.soz_tanik;
  delete from public.soz_takip;
  delete from public.gorev_tanik;
  delete from public.mentorluk_kayit;
  delete from public.mini360_dis;
  delete from public.mini360_oz;
  delete from public.predictions;
  delete from public.kudos;
  delete from public.ratings;
  delete from public.assignments;
  delete from public.excluded_pairs;
  delete from public.churn_radar;
  delete from public.momentum_scores;
  delete from public.redler;
  delete from public.login_attempts;
  delete from public.bosluk_ani;
  delete from public.voice_profiles;
  delete from public.pledges;
  delete from public.gunluk_checkin;
  delete from public.mirror_letters;
  delete from public.mirror_moments;
  delete from public.photos;
  delete from public.oyun_plani;
  delete from public.senin_icin;
  delete from public.ayna_tek_cumle;
  delete from public.kocu_mesajlar;

  -- FAZ 1-6'da eklenen katılımcı/eşleşme/kamp-sonrası tabloları (FK için önce).
  delete from public.kanit_gorevi;
  delete from public.gorev_eslesme;
  delete from public.akran_kurtarma;
  delete from public.salon_daveti;
  delete from public.kamp_arkadasi_checkin;
  delete from public.kamp_arkadasi;
  delete from public.muhur_zinciri;
  delete from public.eylul_aynasi;
  delete from public.is_verisi;

  -- Ana katılımcı tabloları.
  delete from public.missions;
  delete from public.pusula;
  delete from public.hedef;
  delete from public.on_farkindalik;
  delete from public.soz;
  delete from public.pairs;
  delete from public.ayna_esi;
  delete from public.grup_odev;
  delete from public.push_subscriptions;

  -- Katılımcılar (admin korunur).
  delete from public.participants where role = 'participant';

  -- Değerlendirme pencereleri kapanır.
  update public.waves set is_open = false, opened_at = null, closed_at = null;

  -- FAZ 9 ORKESTRATÖR: senaryo satırlarını yeniden 'bekliyor'a çek — bir sonraki
  -- kamp sıfırdan başlasın (ateşlenmiş/atlanmış satır kalmasın).
  update public.kamp_senaryosu set durum = 'bekliyor', atesleme_zamani = null;

  -- Geçici/kamp-durumu ayarları (kalıcı config + wa_tpl_* korunur).
  delete from public.settings where
    key in (
      'reports_visible','muhur_acik','pusula_acik','on_farkindalik_acik',
      'oyun_secimi_acik','bosluk_acik','kapanis_soz_acik',
      'ayna_aktif','ayna_baslangic','ayna_ek_ton','ayna_esi_acik','ayna_tempo',
      'sonraki_dalga_zamani','gunun_cumlesi','gunun_temasi','kapali_gorev_turleri',
      'hedef_acik','mini360_acik','mini360_tur','soz_v2_acik','sahne_dalga',
      'sistem_modu','yolculuk_baslangic','wave4_davet_gonderildi','akilli_durtme_son_tarih',
      'prova_aktif','prova_gun','prova_gun_baslangic','prova_modu',
      -- FAZ 9 orkestratör kumanda kontrolleri + orkestratörün açtığı bayraklar
      'orkestrator_durduruldu','senaryo_kaydirma_dk','gorev_uretimi_durduruldu',
      'altin_gorev_acik','iki_kapi_acik','johari_capraz_acik','tanik_gorevi_acik',
      'mini_konsey_acik','tahmin_sapmasi_acik','kanit_garantisi_acik',
      'kamp_zinciri_acik','kume_gorev_acik','muhur_plus30_acik','muhur_plus60_acik',
      'muhur_plus90_acik','eylul_kanit_modu','muhur_plus_acik'
    )
    or key like 'sabah_soz_%'
    or key like 'mentorluk_%'
    or key like 'fisilti_%'
    or key like 'senkron_%'
    or key like 'gece_%'
    or key like 'momentum_%'
    or key like 'kayma_%'
    or key like 'sahne_%'
    or key like 'ortak_hatirlatma_%'
    or key like 'soz_hatirlatma_%';
end;
$function$;

-- BİR KERELİK TEMİZLİK: testten kalan bayat ayna_baslangic'i sil. Bu kampı
-- AÇMAZ (ayna_aktif zaten false); yalnız "Kampı Başlat" gününde gün sayacının
-- sıfırdan başlamasını sağlar. Yoksa no-op.
delete from public.settings where key = 'ayna_baslangic';
