// Eğitim kartı aksiyonları: takvime ekle, WhatsApp paylaş, deep link kopyala
// ICS (RFC 5545) standartı tüm takvim uygulamalarınca desteklenir.

const parseTarih = (t) => {
  if (!t) return null;
  const parts = String(t).split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
};

// Tarih + saat → Date objesi
const egitimZamani = (egitim) => {
  const d = parseTarih(egitim.tarih);
  if (!d) return null;
  const [saat = 0, dk = 0] = (egitim.saat || '0:0').split(':').map(Number);
  const baslangic = new Date(d);
  baslangic.setHours(saat, dk, 0, 0);
  let bitis;
  if (egitim.bitisSaati) {
    const [bSaat, bDk] = egitim.bitisSaati.split(':').map(Number);
    bitis = new Date(d);
    bitis.setHours(bSaat, bDk, 0, 0);
  } else {
    bitis = new Date(baslangic.getTime() + 60 * 60000); // 1 saat default
  }
  return { baslangic, bitis };
};

// ICS için tarih formatı: YYYYMMDDTHHmmssZ (UTC)
const icsDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
};

const escapeIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// Zoom URL'i yer'den çıkart
export const extractZoomUrl = (yer) => {
  if (!yer) return null;
  const httpsMatch = yer.match(/https?:\/\/\S+/);
  if (httpsMatch) return httpsMatch[0];
  const idMatch = yer.match(/(\d[\d\s]{6,})/);
  if (idMatch) return `https://zoom.us/j/${idMatch[1].replace(/\s/g, '')}`;
  return null;
};

// ICS dosyası oluştur (Apple Calendar, Outlook, Thunderbird, vs)
export const generateICS = (egitim) => {
  const zaman = egitimZamani(egitim);
  if (!zaman) return null;

  const zoomUrl = extractZoomUrl(egitim.yer);
  const aciklama = [
    egitim.egitmen ? `Eğitmen: ${egitim.egitmen}` : '',
    egitim.kategori ? `Kategori: ${egitim.kategori}` : '',
    zoomUrl ? `\n${zoomUrl}` : '',
    egitim.aciklama || '',
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amare Global//One Team Egitim//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${egitim.id || 'egitim'}-${zaman.baslangic.getTime()}@oneteamglobal.ai`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(zaman.baslangic)}`,
    `DTEND:${icsDate(zaman.bitis)}`,
    `SUMMARY:${escapeIcs(egitim.egitim)}`,
    `DESCRIPTION:${escapeIcs(aciklama)}`,
    egitim.yer ? `LOCATION:${escapeIcs(zoomUrl || egitim.yer)}` : '',
    zoomUrl ? `URL:${zoomUrl}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(egitim.egitim)} 15 dakika sonra başlıyor`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return lines;
};

// ICS dosyasını indirme tetikle
export const downloadICS = (egitim) => {
  const ics = generateICS(egitim);
  if (!ics) return false;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = String(egitim.egitim || 'egitim')
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, '_')
    .slice(0, 50);
  a.download = `${safeName}_${egitim.tarih || ''}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

// Google Calendar URL — tek tıkla ekle
export const googleCalendarUrl = (egitim) => {
  const zaman = egitimZamani(egitim);
  if (!zaman) return null;
  const fmt = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const zoomUrl = extractZoomUrl(egitim.yer);
  const details = [
    egitim.egitmen ? `Eğitmen: ${egitim.egitmen}` : '',
    egitim.kategori ? `Kategori: ${egitim.kategori}` : '',
    zoomUrl ? zoomUrl : '',
    egitim.aciklama || '',
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: egitim.egitim || 'Eğitim',
    dates: `${fmt(zaman.baslangic)}/${fmt(zaman.bitis)}`,
    details,
    location: zoomUrl || egitim.yer || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Outlook web add — Microsoft 365 + Outlook.com
export const outlookCalendarUrl = (egitim) => {
  const zaman = egitimZamani(egitim);
  if (!zaman) return null;
  const zoomUrl = extractZoomUrl(egitim.yer);
  const body = [
    egitim.egitmen ? `Eğitmen: ${egitim.egitmen}` : '',
    egitim.kategori ? `Kategori: ${egitim.kategori}` : '',
    zoomUrl ? zoomUrl : '',
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: egitim.egitim || 'Eğitim',
    startdt: zaman.baslangic.toISOString(),
    enddt: zaman.bitis.toISOString(),
    body,
    location: zoomUrl || egitim.yer || '',
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// WhatsApp paylaş — eğitim bilgisi + zoom linki
// Detay linki BAŞTA — WhatsApp ilk URL'i preview olarak gösterir
// (mesajda 2 link varsa sadece birini önizler). Zoom altta zaten /e/ sayfasında da var.
export const whatsappShareUrl = (egitim, baseUrl) => {
  const zoomUrl = extractZoomUrl(egitim.yer);
  const dl = deepLink(egitim, baseUrl);
  const lines = [
    `${dl}\n`, // ← İLK URL: bizim sayfamız, WhatsApp bunu önizler (zengin OG)
    `📅 *${egitim.egitim || 'Eğitim'}*`,
    `🗓️ ${egitim.tarih || ''} ${egitim.gun || ''}`,
    egitim.saat ? `⏰ ${egitim.saat}${egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}` : '',
    egitim.egitmen ? `🎤 ${egitim.egitmen}` : '',
    zoomUrl ? `\n📡 Zoom toplantı: ${zoomUrl}` : '',
  ].filter(Boolean).join('\n');
  return `https://wa.me/?text=${encodeURIComponent(lines)}`;
};

// Deep link — paylaşılabilir URL (/e/:id formatı SEO + OG önizleme için)
export const deepLink = (egitim, baseUrl) => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/e/${encodeURIComponent(egitim.id || '')}`;
};

// Linki kopyala
export const copyDeepLink = async (egitim) => {
  const dl = deepLink(egitim);
  try {
    await navigator.clipboard.writeText(dl);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = dl;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return true;
  }
};
