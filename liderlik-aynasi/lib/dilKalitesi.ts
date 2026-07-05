// ORTAK DİL KALİTESİ KURALI — kişiye gösterilen tüm AI metinlerinin (rapor,
// mektup, plan, koçluk yorumu) sonuna eklenir. Sahadan gelen üç kusuru keser:
//   1) Devrik/eksik cümle ("o, onlara verebileceğin en büyük miras").
//   2) Yanlış kişi çekimi ("sen ... buldu" → "buldun").
//   3) Uydurma kelime/ek ("hissettiveyi", "ne BELİ olduğu").
// Kurallı, düz, kusursuz Türkçe zorunlu — bu metinler kampın en değerli anıdır.
export const DIL_KALITESI = `DİL KALİTESİ (ZORUNLU — bu metin katılımcıya gösterilecek):
- Kusursuz, kurallı Türkçe yaz. Dilbilgisi hatası, uydurma kelime ya da var olmayan ek KESİNLİKLE olmayacak.
- DEVRİK CÜMLE KULLANMA. Her cümle düz kurulsun: özne–tümleç–yüklem, yüklem sonda ve tam olsun. Yarım/eksik cümle yok.
- Kişi çekimini doğru yap: "sen" ile başlayan cümlenin yüklemi de 2. tekil olmalı ("buldun", "gösterdin" — "buldu" DEĞİL).
- Her cümleyi yazmadan önce zihninde bir kez oku: sıradan bir okuyucu tek okumada, takılmadan anlıyor mu? Anlamıyorsa sadeleştir.`;
