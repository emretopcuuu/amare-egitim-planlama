-- GRUP ATAMA — DIŞLAMA LİSTESİNE SAYGI. Eski grup_ata (0079) yalnız "en boş aday
-- grup"u seçiyordu; Dışlama Listesi'ni (excluded_pairs) hiç okumuyordu, dolayısıyla
-- birbirini dışlayan iki kişi aynı gruba düşebiliyordu. Artık aday gruplar arasında
-- ÖNCE bu kişiyle dışlanmış birini İÇERMEYEN gruplar, sonra en boş, sonra rastgele
-- seçilir. Tüm aday gruplar çakışıyorsa yine de en boşa atanır (atama başarısız
-- olmasın — best effort). İmza + atomiklik (advisory lock) + idempotentlik aynı;
-- dışlama yoksa davranış 0079 ile birebir (catisma her zaman false).
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
  perform pg_advisory_xact_lock(hashtext('grup_atama'));

  -- Idempotent: zaten atanmışsa mevcut grubu döndür.
  select team into v_mevcut from participants where id = p_participant;
  if v_mevcut is not null then
    return v_mevcut;
  end if;

  -- Aday gruplar: (1) dışlama çakışması olmayanlar önce, (2) en boş, (3) rastgele.
  select aday into v_hedef
  from unnest(p_adaylar) as aday
  left join lateral (
    select count(*) as dolu
    from participants p
    where p.team = aday and p.role = 'participant'
  ) c on true
  left join lateral (
    select exists (
      select 1
      from participants p
      join excluded_pairs ep
        on (ep.a_id = p_participant and ep.b_id = p.id)
        or (ep.b_id = p_participant and ep.a_id = p.id)
      where p.team = aday and p.role = 'participant'
    ) as catisma
  ) x on true
  order by x.catisma asc, c.dolu asc, random()
  limit 1;

  if v_hedef is null then
    return null;
  end if;

  update participants set team = v_hedef where id = p_participant and team is null;
  select team into v_mevcut from participants where id = p_participant;
  return v_mevcut;
end;
$$;

revoke all on function grup_ata(uuid, text[]) from public, anon, authenticated;
