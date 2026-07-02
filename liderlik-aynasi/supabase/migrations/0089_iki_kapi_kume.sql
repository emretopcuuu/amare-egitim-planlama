-- FAZ 5.4 — İKİ KAPI: ara sıra görev yerine bir seçim sunulur (🔥 eşik / 🤝 isim).
-- İki görev üretilip aynı secim_grubu ile bağlanır; kişi birini seçince öteki
-- 'expired' olur, seçilen 'pending' kalır. kapi_etiket: kartta gösterilen kısa
-- seçenek etiketi. secim_bekliyor: henüz seçilmemiş kapı adayı (UI listeler,
-- normal aktif görev SAYMAZ — bekleyen kontrolünü bozmasın diye ayrı statü).
alter table missions add column if not exists secim_grubu uuid;
alter table missions add column if not exists kapi_etiket text;

create index if not exists missions_secim_grubu_idx on missions (secim_grubu) where secim_grubu is not null;

-- FAZ 5.3 — SENKRONİZE KÜME: aynı anda birden çok kişiye düşen özdeş görev;
-- baglanti_id (0087) ile gruplanır, teslimde "kimlerle birlikte yaptın" reveal.
-- Ek kolon gerekmez — baglanti_id + kind yeterli.
