-- FAZ 1 (Kamp sonrası motor) — PLAN ATÖLYESİ. "90 Günlük Oyun Planı" artık
-- AI'ın dayattığı değil, kişinin AI ÖNERİSİNDEN kendi kararıyla kurduğu plan.
--   • 4. ufuk eklendi: ilk_72_saat (İlk 72 Saat · 10 gün · 40 gün · 90 gün).
--   • durum: 'taslak' (AI önerisi + kişi düzenliyor) → 'onaylandi' (söz anında kilit).
-- Söz (soz.ts) yalnız ONAYLANMIŞ planı okur; İlk 72 Saat kartı ilk_72_saat'i tercih eder.
alter table public.oyun_plani
  add column if not exists ilk_72_saat jsonb not null default '[]'::jsonb,
  add column if not exists durum text not null default 'taslak',
  add column if not exists onaylandi_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'oyun_plani_durum_check'
  ) then
    alter table public.oyun_plani
      add constraint oyun_plani_durum_check check (durum in ('taslak', 'onaylandi'));
  end if;
end $$;
