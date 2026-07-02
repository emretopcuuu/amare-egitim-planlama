-- [E11] EYLÜL AYNASI DIŞ LİNK — oturum gerektirmeyen, tek kullanımlık, 14 gün
-- geçerli dış değerlendirme jetonu. Kişi ekibinden 3 kişiye link yollar; dış
-- değerlendirici oturumsuz doldurur (KVKK onayıyla). PII sızmaz: dış kişi yalnız
-- kişinin ADINI görür; kendi kimliğini vermez, kayıt anonimdir.
create table if not exists eylul_dis (
  token          text        primary key,
  participant_id uuid        not null references participants(id) on delete cascade,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  cevaplar       jsonb,
  yorum          text,
  kvkk_onay      boolean     not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists eylul_dis_pid_idx on eylul_dis (participant_id);
alter table eylul_dis enable row level security;
revoke all on eylul_dis from anon, authenticated;
