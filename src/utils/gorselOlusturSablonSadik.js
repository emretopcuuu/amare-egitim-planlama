// Şablon Sadık (A) modu — şablon %100 birebir korunur, üst/alt karartma yok;
// yazı bloklarının arkasına yalnız lokal okunabilirlik gölgesi. Foto+yazı
// deterministik Canvas ile çizilir (AI yok → şablon bozulmaz). Ücretsiz, anlık.
import { gorselOlusturCanvas } from './gorselOlusturCanvas';

export const gorselOlusturSablonSadik = (params) =>
  gorselOlusturCanvas({ ...params, sablonSadik: true });
