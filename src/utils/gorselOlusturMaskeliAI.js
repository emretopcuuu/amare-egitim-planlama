// Maskeli AI (B) modu — seçilen şablon taban olarak korunur; gerçek fotoğraflar
// pre-composite edilir (yüzler sabit), yalnız içerik bantları (başlık + alt bilgi)
// maske ile AI'a açılır. Şablonun geri kalanı bozulmaz. ~$0.08, sonuç değişken;
// başarısızsa modal fallback zinciri Şablon Sadık (A)'ya düşer.
import { gorselOlusturOpenAIPro } from './gorselOlusturOpenAIPro';

export const gorselOlusturMaskeliAI = (params) =>
  gorselOlusturOpenAIPro({ ...params, maske: true });
