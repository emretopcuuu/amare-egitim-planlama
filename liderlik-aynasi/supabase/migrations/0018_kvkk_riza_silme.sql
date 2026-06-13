-- KVKK: açık rıza zamanı + veri silme talebi. Katılımcı düzeyinde tutulur.
alter table public.participants
  add column if not exists consent_at timestamptz,
  add column if not exists deletion_requested_at timestamptz;
