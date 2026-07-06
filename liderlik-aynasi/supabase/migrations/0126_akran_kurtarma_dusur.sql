-- [FAZ 3] Ölü tablo temizliği: akran_kurtarma hiçbir yerde YAZILMIYOR/OKUNMUYOR
-- (kodda database.types.ts dışında sıfır referans). Gerçek kampa temiz şemayla
-- girmek için düşürülür. Yalnız participants/missions'a giden FK'leri var; kimse
-- ona referans vermediği için düşürmek güvenli.
drop table if exists akran_kurtarma;
