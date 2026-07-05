-- 0117 — ONBOARDING UX: yarıda bırakana hatırlatma + bitiş töreni damgaları.
-- [E6] onboarding_hatirlatma_at: kamp ÖNCESİ dönemde, onboarding'i yarıda
--      bırakan kişiye atılan tek seferlik "kaldığın yerden devam et" push'unun
--      damgası (dolu = bir daha gönderilmez).
-- [E10] onboarding_toren_at: onboarding'in tamamı ilk kez yeşile döndüğünde
--      gösterilen tam ekran "Aynan kuruldu" töreninin tek seferlik damgası.

alter table public.participants
  add column if not exists onboarding_hatirlatma_at timestamptz,
  add column if not exists onboarding_toren_at timestamptz;

comment on column public.participants.onboarding_hatirlatma_at is
  'Onboarding yarıda kaldı hatırlatma push''u gönderildi (tek seferlik).';
comment on column public.participants.onboarding_toren_at is
  'Onboarding bitiş töreni (Aynan kuruldu) gösterildi (tek seferlik).';

-- KAMP CANLI GÜVENLİĞİ: onboarding'ini ÇOKTAN bitirmiş mevcut katılımcılara
-- tören ekranı sonradan patlamasın — tamamlanmış herkese damga geriye dönük
-- basılır. Tören yalnız bundan SONRA tamamlayanlar (ör. geç katılan) için çalışır.
update public.participants p
set onboarding_toren_at = now()
where p.role = 'participant'
  and p.onboarding_toren_at is null
  and p.team is not null
  and exists (select 1 from public.voice_profiles v where v.participant_id = p.id)
  and exists (select 1 from public.degerler_calismasi d
                where d.participant_id = p.id and d.tamamlandi_at is not null)
  and exists (select 1 from public.pusula pu
                where pu.participant_id = p.id and pu.tamamlandi_at is not null)
  and exists (select 1 from public.hedef h
                where h.participant_id = p.id and h.tamamlandi_at is not null)
  and exists (select 1 from public.on_farkindalik o
                where o.participant_id = p.id and o.tamamlandi_at is not null);
