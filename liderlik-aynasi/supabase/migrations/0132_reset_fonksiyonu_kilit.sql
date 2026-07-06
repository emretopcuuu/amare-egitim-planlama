-- GÜVENLİK: yeni_kamp_hazirla() SECURITY DEFINER bir fonksiyon ve TÜM kampı sıfırlar
-- (tüm katılımcıları + verileri siler). Varsayılan olarak public/anon/authenticated
-- EXECUTE hakkıyla açılmıştı → tarayıcıdaki public anon key ile
-- /rest/v1/rpc/yeni_kamp_hazirla üzerinden DIŞARIDAN çağrılıp kamp silinebilirdi.
-- Yalnız service-role (uygulamanın admin reset ucu) çağırabilsin. 0129'dan sonra
-- gelir; fonksiyonun her recreate'inde grant public'e döneceği için revoke burada.
revoke execute on function public.yeni_kamp_hazirla() from anon, authenticated, public;
