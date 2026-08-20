// emretopcu.ai posta görevi tetikleyicisi — Netlify scheduled function.
// Her gün 07:00 UTC'de (10:00 İstanbul) Cloudflare'deki posta motorunu
// dürter; sırası gelen abonelere günün maili gider. Anahtar env'de yoksa
// sessizce çıkar (motor kurulana kadar zararsız).
export const config = { schedule: '0 7 * * *' };

export default async () => {
  const anahtar = process.env.POSTA_GOREV_ANAHTARI;
  if (!anahtar) {
    console.log('posta-tetik: POSTA_GOREV_ANAHTARI yok, atlandı');
    return new Response('atlandi', { status: 200 });
  }
  try {
    const r = await fetch('https://emretopcu.ai/api/posta-gorevi', {
      method: 'POST',
      headers: { 'x-gorev-anahtar': anahtar },
    });
    const govde = await r.text();
    console.log('posta-tetik:', r.status, govde.slice(0, 300));
    return new Response(govde, { status: 200 });
  } catch (hata) {
    console.log('posta-tetik hata:', hata?.message ?? hata);
    return new Response('hata', { status: 200 });
  }
};
