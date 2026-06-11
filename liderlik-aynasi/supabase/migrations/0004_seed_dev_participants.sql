-- Geliştirme seed'i: 1 admin + 8 sahte katılımcı.
-- Takım/şehir çeşitliliği bilinçli: Faz 3 eşleştirme algoritması testleri için.
-- Gerçek CSV import öncesi bu kayıtlar silinecek.
insert into public.participants (full_name, team, city, phone, login_code, role) values
  ('Test Yönetici', null,        null,       null,            '999999', 'admin'),
  ('Ayşe Yılmaz',   'Kartallar', 'İstanbul', '+905001112233', '111111', 'participant'),
  ('Mehmet Demir',  'Kartallar', 'Ankara',   '+905001112234', '222222', 'participant'),
  ('Zeynep Kaya',   'Şahinler',  'İzmir',    '+905001112235', '333333', 'participant'),
  ('Ali Çelik',     'Şahinler',  'İstanbul', '+905001112236', '444444', 'participant'),
  ('Fatma Şahin',   'Aslanlar',  'Bursa',    '+905001112237', '555555', 'participant'),
  ('Emre Topçu',    'Aslanlar',  'Ankara',   '+905001112238', '666666', 'participant'),
  ('Elif Arslan',   'Kartallar', 'İzmir',    '+905001112239', '777777', 'participant'),
  ('Burak Koç',     'Şahinler',  'Antalya',  '+905001112240', '888888', 'participant');
