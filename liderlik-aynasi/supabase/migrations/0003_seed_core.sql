-- Çekirdek seed: 10 liderlik özelliği, 3 dalga, ayarlar
insert into public.traits (name, observation_hint, sort_order) values
  ('Örnek Olmak',     'Söylediklerini önce kendisi mi yaşıyor? Zor anlarda duruşunu koruyor mu?', 1),
  ('Çalışkanlık',     'Trekking''de, görevlerde, sabah erken kalkışta gözlemle.', 2),
  ('Dürüstlük',       'Sözü ve davranışı tutarlı mı? Hatasını açıkça kabul ediyor mu?', 3),
  ('Vizyonerlik',     'Büyük resmi anlatabiliyor mu? Konuşmalarında gelecek ufku var mı?', 4),
  ('Mütevazılık',     'Başarıyı paylaşıyor mu? Dinlerken mi konuşurken mi daha çok?', 5),
  ('Takım Ruhu',      'Zorlanan ekip arkadaşına destek oluyor mu? Ortak görevlerde nasıl?', 6),
  ('İletişim Gücü',   'Derdini açık ve sade anlatıyor mu? Karşısındakine göre dilini ayarlıyor mu?', 7),
  ('Cesaret',         'Riskli görevlerde öne çıkıyor mu? Sahnede, parkurlarda, ilk adımda gözlemle.', 8),
  ('Sorumluluk Alma', 'Beklemeden harekete geçiyor mu? İşi sahiplenip sonuna kadar götürüyor mu?', 9),
  ('Pozitif Enerji',  'Ortama enerji katıyor mu? Yorgunken bile çevresini ayağa kaldırıyor mu?', 10);

insert into public.waves (id, name, is_open) values
  (1, 'Dalga 1 — İlk İzlenim', false),
  (2, 'Dalga 2 — Gözlem', false),
  (3, 'Dalga 3 — Gerçek Algı', false);

insert into public.settings (key, value) values ('reports_visible', 'false');
