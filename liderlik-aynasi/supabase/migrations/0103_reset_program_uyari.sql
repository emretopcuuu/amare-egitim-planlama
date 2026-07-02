-- yeni_kamp_hazirla(): reset, 'program_uyari_%' anahtarlarını da temizlesin.
-- 0102 sertleştirmesinde bu desen atlanmıştı; senkron_/kayma_/sabah_soz_ gibi
-- tarih-anahtarlı program uyarı idempotency kayıtları da sıfırlanmalı ki bir
-- sonraki kamp tertemiz başlasın. Fonksiyon 0102 gövdesiyle birebir aynı; yalnız
-- settings silme desenine 'program_uyari_%' eklendi.
create or replace function public.yeni_kamp_hazirla()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
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

  delete from public.kanit_gorevi;
  delete from public.gorev_eslesme;
  delete from public.akran_kurtarma;
  delete from public.salon_daveti;
  delete from public.kamp_arkadasi_checkin;
  delete from public.kamp_arkadasi;
  delete from public.muhur_zinciri;
  delete from public.eylul_aynasi;
  delete from public.is_verisi;

  delete from public.missions;
  delete from public.pusula;
  delete from public.hedef;
  delete from public.on_farkindalik;
  delete from public.soz;
  delete from public.pairs;
  delete from public.ayna_esi;
  delete from public.grup_odev;
  delete from public.push_subscriptions;

  delete from public.participants where role = 'participant';

  update public.waves set is_open = false, opened_at = null, closed_at = null;

  update public.kamp_senaryosu set durum = 'bekliyor', atesleme_zamani = null;

  delete from public.settings where
    key in (
      'reports_visible','muhur_acik','pusula_acik','on_farkindalik_acik',
      'oyun_secimi_acik','bosluk_acik','kapanis_soz_acik',
      'ayna_aktif','ayna_baslangic','ayna_ek_ton','ayna_esi_acik','ayna_tempo',
      'sonraki_dalga_zamani','gunun_cumlesi','gunun_temasi','kapali_gorev_turleri',
      'hedef_acik','mini360_acik','mini360_tur','soz_v2_acik','sahne_dalga',
      'sistem_modu','yolculuk_baslangic','wave4_davet_gonderildi','akilli_durtme_son_tarih',
      'prova_aktif','prova_gun','prova_gun_baslangic','prova_modu',
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
    or key like 'program_uyari_%'
    or key like 'ortak_hatirlatma_%'
    or key like 'soz_hatirlatma_%';
end;
$function$;
