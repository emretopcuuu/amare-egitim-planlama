-- [B#14] SÖZ DUVARI (opt-in) — kişi "sözüm duvarda görünsün" derse, sözünden
-- İSİMSİZ bir ilham cümlesi herkese akar. Varsayılan KAPALI (kimse istemeden
-- sözü ortaya çıkmaz). Yalnız duvarda=true olanların sözü, isim/kimlik olmadan.
alter table soz add column if not exists duvarda boolean not null default false;
