-- Katılımcının ilk başarılı giriş zamanını kaydeder.
-- NULL = henüz hiç giriş yapılmadı → "giriş yapmamış" filtresi için kullanılır.
alter table participants
  add column if not exists first_login_at timestamptz null;
