-- WhatsApp tıklamalarını da kayda alabilmek için hedef kısıtını gevşet: artık
-- kanal 'whatsapp' satırları herhangi bir onboarding aşamasıyla (rituel, pusula …)
-- kaydedilebilir. Manuel in-app dürtme uygulama katmanında zaten degerler/oyun'la
-- sınırlı; bu değişiklik yalnız kanal çeşitliliğine (WhatsApp) izin verir.
alter table onboarding_hatirlatma drop constraint if exists onboarding_hatirlatma_hedef_check;
