-- Deny-all RLS duruşu: tüm veri erişimi Next.js sunucu katmanından service_role ile yapılır.
-- anon/authenticated rollerine hiçbir policy tanımlanmaz; tarayıcıya giden anahtar hiçbir tabloyu okuyamaz.
alter table public.participants   enable row level security;
alter table public.traits         enable row level security;
alter table public.waves          enable row level security;
alter table public.assignments    enable row level security;
alter table public.ratings        enable row level security;
alter table public.settings       enable row level security;
alter table public.login_attempts enable row level security;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
