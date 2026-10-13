// netlify/functions/yonetim-kurulu.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/yonetim-kurulu
//
// One Team Yönetim Kurulu üye listesi. Kurul, 21 Eylül 2026'da kapanan
// Yürütme Kurulu'nun yerini aldı (anket kararı: "Yürütme Kurulu toplantıları
// sona erdi; 28 Eylül'den itibaren haftalık toplantılar Yönetim Kurulu
// toplantısı olarak yapılır"). Kurulu Diamond ve üstü liderler oluşturur.
//
// Liste Supabase crm_members.career_rank'ten CANLI türetilir — rütbe atlayan
// lider ertesi gün kendiliğinden listeye girer, elle bakım gerekmez.
//
// GİZLİLİK: dışarı YALNIZCA ad verilir. Rütbe sıralama için kullanılır ama
// yanıta KONULMAZ — sayfanın kuruluşundan beri gelen "rütbe/kariyer görünmez"
// kararı korunur. E-posta/telefon hiç sorgulanmaz.
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
// crm_members RLS aktif — anon key boş döner, service role gerek
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Üst rütbe önce — sayfadaki sıralama bu
const RUTBE_SIRA = {
  'Presidential Diamond': 1,
  '3-Star Diamond': 2,
  '2-Star Diamond': 3,
  '1-Star Diamond': 4,
  'Diamond': 5,
};
const RUTBELER = Object.keys(RUTBE_SIRA);

// ORTAK HESAP EKİ — kendi adına Diamond kaydı OLMAYAN ama kurulda yer alan
// eş/ortaklar. Rütbe, hesabı tutan kişinin adına kayıtlı olduğu için otomatik
// listede çıkmazlar; buradan eklenirler (Emre onayı, 13 Eki 2026).
// Yeni ortak hesap çıkarsa tek satır eklemek yeterli.
const ORTAK_HESAP_EKI = [
  { ad: 'Barış Diker', sira: 4 },
  { ad: 'Filiz Bayazıt', sira: 4 },
  { ad: 'İlknur Akkaş', sira: 4 },   // Özgür Akkaş hesabı
  { ad: 'Şule Bağcı', sira: 4 },     // BAĞCI AKADEMİ hesabı
  { ad: 'Yavuz Bağcı', sira: 4 },    // BAĞCI AKADEMİ hesabı
];

// Türkçe karşılaştırma için sadeleştirme (sıralama + mükerrer ayıklama)
const sadelestir = (s) => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/\s+/g, ' ')
  .trim();

const jsonRes = (govde, durum, basliklar) => ({
  statusCode: durum,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...basliklar },
  body: typeof govde === 'string' ? govde : JSON.stringify(govde),
});

export const handler = async () => {
  // Liste günde bir kez değişir → CDN'de 1 saat taze, 6 saat bayat-servis.
  // Netlify CDN'i SADECE Netlify-CDN-Cache-Control sürer (düz Cache-Control değil).
  const basliklar = {
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=21600',
    'Cache-Control': 'public, max-age=300',
  };
  // Hata yanıtı CDN'de YAPIŞMASIN — geçici Supabase arızası 1 saat sürmesin
  const hataBasliklari = { 'Cache-Control': 'no-store' };

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return jsonRes({ error: 'yapilandirma' }, 500, hataBasliklari);
  }

  try {
    const sorgu = RUTBELER.map(r => `"${r}"`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_members?select=full_name,career_rank&career_rank=in.(${encodeURIComponent(sorgu)})&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error('supabase ' + res.status);
    const satirlar = await res.json();

    const gorulen = new Set();
    const liste = [];

    for (const s of satirlar) {
      const ad = String(s.full_name || '').replace(/\s+/g, ' ').trim();
      if (!ad) continue;
      const anahtar = sadelestir(ad);
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      liste.push({ ad, _sira: RUTBE_SIRA[s.career_rank] || 9 });
    }

    for (const e of ORTAK_HESAP_EKI) {
      const anahtar = sadelestir(e.ad);
      if (gorulen.has(anahtar)) continue; // kendi adına rütbe almışsa tekrar etme
      gorulen.add(anahtar);
      liste.push({ ad: e.ad, _sira: e.sira });
    }

    liste.sort((a, b) => a._sira - b._sira || a.ad.localeCompare(b.ad, 'tr'));

    // Rütbe DIŞARI ÇIKMAZ — yalnız sıralamada kullanıldı
    return jsonRes({ uyeler: liste.map(u => ({ ad: u.ad })), sayi: liste.length }, 200, basliklar);
  } catch (e) {
    console.error('[yonetim-kurulu]', e?.message);
    return jsonRes({ error: 'liste-alinamadi' }, 500, hataBasliklari);
  }
};
