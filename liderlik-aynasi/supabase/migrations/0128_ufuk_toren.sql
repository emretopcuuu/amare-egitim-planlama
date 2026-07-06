-- [FAZ 8 · Madde 8] Ufuk geçiş törenleri: kişinin aktif plan ufku değişince
-- (ilk_72_saat → on_gun → kirk_gun → doksan_gun) bir kez kutlama push'u atılır.
-- Son kutlanan ufku kişi bazında saklarız ki her geçiş yalnız BİR kez kutlansın.
-- participants kolonu (settings anahtarı yerine) → reset'te cascade ile temizlenir.
alter table participants add column if not exists son_ufuk_toren text;
