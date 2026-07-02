// Zoom "Katıl" tıklaması takibi — fire-and-forget, navigasyonu ASLA engellemez.
// İki kanal:
//   1. trackEvent('zoom_katil')  → egitim_analytics (admin analiz: saat/gün/cihaz)
//   2. /.netlify/functions/katil-tikla → takvim/{id}.katilTiklamaSayisi
//      (sunucu-doğrulamalı sayaç; kişi başına TEK sayım — "X kişi katıldı" rozeti bundan okur)
import { auth } from './firebase';
import { trackEvent } from './analytics';

export function katilTikla(egitim) {
  try {
    if (!egitim?.id) return;
    trackEvent('zoom_katil', { egitimId: egitim.id, egitimAdi: egitim.egitim || '' });
    (async () => {
      try {
        const user = auth?.currentUser;
        if (!user) return; // anonim oturum otomatik açılır; yoksa sessiz geç
        const idToken = await user.getIdToken();
        await fetch('/.netlify/functions/katil-tikla', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ egitimId: egitim.id }),
          keepalive: true, // sekme Zoom'a giderken istek yarıda kalmasın
        });
      } catch {}
    })();
  } catch {}
}
