-- "Yeni Kamp Hazırla" sıfırlamasını kapsamlı hale getir.
-- Eski yeni_kamp_hazirla() sonradan eklenen birçok katılımcı tablosunu ve
-- geçici settings'i temizlemiyordu (grup_odev, mirror_moments, pairs, kocu_mesajlar,
-- mini360, oyun_plani, soz/soz_durtme/soz_tanik, prova/mod ayarları, gece/momentum/
-- kayma kilitleri...). Bu yüzden sıfırlama sonrası eski veri kalıyordu (ör. dünden
-- kalan grup ödevi). Tüm katılımcı verisini ve kamp durumunu temizleyecek şekilde
-- yeniden yazıldı. KORUNAN yapı/config: traits, waves (satırlar; durum sıfırlanır),
-- participants (admin), audit_log, schedule_items, scheduled_events ve kalıcı
-- ayarlar (kamp_tarihi, kamp_kilit_kodu, yansima_model, wa_tpl_* şablonları).
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

  -- Geçici/kamp-durumu ayarları (kalıcı config + wa_tpl_* korunur).
  delete from public.settings where
    key in (
      'reports_visible','muhur_acik','pusula_acik','on_farkindalik_acik',
      'oyun_secimi_acik','bosluk_acik','kapanis_soz_acik',
      'ayna_aktif','ayna_baslangic','ayna_ek_ton','ayna_esi_acik','ayna_tempo',
      'sonraki_dalga_zamani','gunun_cumlesi','gunun_temasi','kapali_gorev_turleri',
      'hedef_acik','mini360_acik','mini360_tur','soz_v2_acik','sahne_dalga',
      'sistem_modu','yolculuk_baslangic','wave4_davet_gonderildi','akilli_durtme_son_tarih',
      'prova_aktif','prova_gun','prova_gun_baslangic','prova_modu'
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
