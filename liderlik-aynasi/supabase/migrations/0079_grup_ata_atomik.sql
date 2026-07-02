-- GRUP ATAMA ATOMİKLİĞİ — oyun seçimi yarış düzeltmesi.
-- Eski akış (route içinde oku-hesapla-yaz) eşzamanlı seçimlerde herkese aynı
-- "en boş" grubu gösterip tek gruba yığılmaya yol açabiliyordu (ör. kamp
-- açılışında 6 kişi aynı anda seçince 6'sı da aynı gruba düşer). Bu fonksiyon
-- seçim + yazımı tek transaction'da, advisory lock ile sıralaştırarak yapar
-- (29 kişilik kampta kilit maliyeti ~ms düzeyi, ihmal edilebilir).
create or replace function grup_ata(p_participant uuid, p_adaylar text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mevcut text;
  v_hedef text;
begin
  -- Tüm grup atamalarını tek kuyruğa al — yarış kökten biter.
  perform pg_advisory_xact_lock(hashtext('grup_atama'));

  -- Idempotent: zaten atanmışsa mevcut grubu döndür.
  select team into v_mevcut from participants where id = p_participant;
  if v_mevcut is not null then
    return v_mevcut;
  end if;

  -- Aday gruplar arasında EN BOŞ olanı seç; eşitlikte rastgele.
  select aday into v_hedef
  from unnest(p_adaylar) as aday
  left join lateral (
    select count(*) as dolu
    from participants p
    where p.team = aday and p.role = 'participant'
  ) c on true
  order by c.dolu asc, random()
  limit 1;

  if v_hedef is null then
    return null;
  end if;

  update participants set team = v_hedef where id = p_participant and team is null;
  select team into v_mevcut from participants where id = p_participant;
  return v_mevcut;
end;
$$;

-- Yalnız service-role çağırabilsin (deny-all erişim modeliyle tutarlı).
revoke all on function grup_ata(uuid, text[]) from public, anon, authenticated;
