-- AYNA karakteri Faz 3 — İDDİA SİSTEMİ: görev, AYNA ile İtirazcı arasındaki bir
-- bahis olarak çerçevelendiyse işaretlenir. Skor tablosu ayrı sayaç TUTMAZ:
-- "AYNA kazandı" = bahis görevi scored, "İtirazcı kazandı" = bahis görevi
-- expired — mevcut satırlardan türetilir (idempotent, prova uyumlu; altın
-- görev sayacıyla aynı desen). Kaybeden DAİMA karakterlerdir, asla katılımcı.
alter table public.missions
  add column if not exists bahis boolean not null default false;

comment on column public.missions.bahis is
  'AYNA karakteri Faz 3: görev AYNA-İtirazcı bahsi çerçevesinde mi verildi.';
