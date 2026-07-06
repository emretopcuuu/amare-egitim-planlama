// 5. üretim yöntemi — "AI Afiş" (şablonsuz, bağımsız tasarım).
// OpenAI gpt-image temalı/şehir-illüstrasyonlu BOŞ arka plan üretir (yazı/yüz yok);
// Canvas başlık/tarih/saat/konuşmacılar/adres/QR'ı KESKİN basar (metin hep doğru,
// yüzler hep gerçek). Önceki şablon-sadakat/Amare-palet kurallarından bağımsız.
// Sadece etkinlik verisini kullanır: başlık, tarih, gün, saat, şehir, mekan, adres,
// konuşmacılar + (AdminPanel'de çözülmüş) etiketler.
import { logolariEkle } from './gorselLogoEkle';
import { afisAdresKisa, isFiziki } from './egitmenEtiket';
import { qrOlustur } from './qrOlustur';
import { fotoYerlesim } from './fotoYerlesim';

import { imgYukle as urlToImage } from './imgYukle';

// TR saat → EU saat (yaz EEST UTC+3 → orta avrupa CEST UTC+2 = -1 saat)
const trToEU = (saat) => {
  if (!saat || !/^\d{1,2}:\d{2}$/.test(saat.trim())) return '';
  const [h, m] = saat.trim().split(':').map(Number);
  let eu = h - 1; if (eu < 0) eu += 24;
  return `${String(eu).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
  else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
};

// Çok satır metin — sonraki Y'i döner
const wrapText = (ctx, text, x, y, maxW, lh, maxLines = 6) => {
  const words = String(text || '').split(/\s+/);
  let line = '', yy = y, n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); yy += lh; line = words[i]; n++;
      if (n >= maxLines - 1) { line = words.slice(i).join(' '); break; }
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
};

// Kategori/başlığa göre renk paleti
const paletSec = (egitim) => {
  const k = `${egitim?.kategori || ''} ${egitim?.egitim || ''} ${egitim?.etkinlikTuru || ''}`.toLocaleLowerCase('tr-TR');
  if (/sağlık|yaşam|wellness|panel|doktor/.test(k))
    return { navy: '#123047', teal: '#15897a', tealKoyu: '#0e6155', krem: '#f3f0e7', vurgu: '#c9a24a', bgTema: 'sağlıklı yaşam / wellness — yumuşak teal-yeşil, organik yaprak ve kalp-sağlık çizgi motifleri' };
  if (/liderlik|vizyon|başarı|diamond/.test(k))
    return { navy: '#14233f', teal: '#b8902f', tealKoyu: '#8a6a1f', krem: '#f4f1e7', vurgu: '#caa64e', bgTema: 'liderlik / vizyon — koyu lacivert + altın, ışık huzmeleri, dramatik premium' };
  return { navy: '#142a44', teal: '#2a6f97', tealKoyu: '#1d4e6e', krem: '#f3f1ea', vurgu: '#c9a24a', bgTema: 'modern profesyonel iş etkinliği — lacivert + cam göbeği, ince geometrik formlar' };
};

// Temalı dekoratif arka plan prompt'u (her iki motor için ortak; yazı/yüz/logo YOK)
// ekPrompt: kullanıcının "Tasarıma ek istek"i + varyasyon yönlendirmesi (her üretimde farklı).
const arkaPlanPrompt = (egitim, palet, ekPrompt = '') => {
  const sehir = (egitim?.sehir && egitim.sehir !== 'Online') ? egitim.sehir : '';
  return `Profesyonel bir etkinlik posteri için SADECE DEKORATİF ARKA PLAN üret. ` +
    `Tema: ${palet.bgTema}. ` +
    (sehir ? `Sağ tarafa, ${sehir} şehrinin meşhur landmark'ını ince, zarif tek-renk LINE-ART (çizgi illüstrasyon) olarak yerleştir (örn. İzmir → Saat Kulesi; İstanbul → tarihi silüet). ` : '') +
    `Üst bölge AÇIK/aydınlık olsun (büyük başlık oraya gelecek), alt-orta bölge sade kalsın. ` +
    `Renkler: krem/açık zemin + ${palet.teal} teal vurgular + ${palet.navy} koyu detaylar. ` +
    `Düz/vektör illüstrasyon stili, premium, ferah, ÇOK bol beyaz/boş alan. ` +
    (ekPrompt ? `EK YÖNLENDİRME (uygula, ama yazı/yüz/logo yine YASAK): ${ekPrompt} ` : '') +
    `MUTLAK YASAK (bunlardan HİÇBİRİ olmayacak): insan, yüz, portre, vücut, silüet, kişi; ` +
    `yazı, harf, sayı, kelime; logo, amblem, marka. ` +
    `Sadece soyut dekoratif zemin + (varsa) şehir landmark line-art. İnsan figürü görürsen YANLIŞ.`;
};

// Gemini (nano-banana) ile — tarayıcıdan SORUNSUZ çalışır (googleapis CORS'a izin verir)
const arkaPlanGemini = async (geminiKey, egitim, palet, ekPrompt = '') => {
  const body = {
    contents: [{ role: 'user', parts: [{ text: arkaPlanPrompt(egitim, palet, ekPrompt) }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
  } finally { clearTimeout(t); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini ${res.status}`); }
  const data = await res.json();
  const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!part) throw new Error('Gemini görsel döndürmedi.');
  return await urlToImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
};

// OpenAI (sunucu proxy üzerinden — tarayıcı api.openai.com'a CORS ile erişemez)
const arkaPlanOpenAI = async (openaiKey, egitim, palet, openaiSize, ekPrompt = '') => {
  const res = await fetch('/.netlify/functions/openai-gorsel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: openaiKey, prompt: arkaPlanPrompt(egitim, palet, ekPrompt), size: openaiSize, quality: 'low' }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || `OpenAI proxy ${res.status}`); }
  const data = await res.json();
  if (!data?.b64) throw new Error('OpenAI arka plan döndürmedi.');
  return await urlToImage('data:image/png;base64,' + data.b64);
};

export const gorselOlusturAiAfis = async ({ geminiApiKey, openaiApiKey, egitim, egitmenler = [], ekPrompt = '', format = 'portrait' }) => {
  const palet = paletSec(egitim);

  // Boyut — etkinlik posteri için dikey varsayılan
  const dims = format === 'landscape' ? { W: 1350, H: 1080, os: '1536x1024' }
    : format === 'square' ? { W: 1080, H: 1080, os: '1024x1024' }
      : { W: 1080, H: 1350, os: '1024x1536' }; // portrait/story
  const { W, H } = dims;

  // Zemin motoru: Gemini ÖNCELİK (tarayıcıdan çalışır), olmazsa OpenAI sunucu proxy.
  let arkaPlanImg = null;
  const hatalar = [];
  if (geminiApiKey) {
    try { arkaPlanImg = await arkaPlanGemini(geminiApiKey, egitim, palet, ekPrompt); }
    catch (e) { hatalar.push('Gemini: ' + e.message); }
  }
  if (!arkaPlanImg && openaiApiKey) {
    try { arkaPlanImg = await arkaPlanOpenAI(openaiApiKey, egitim, palet, dims.os, ekPrompt); }
    catch (e) { hatalar.push('OpenAI: ' + e.message); }
  }
  if (!arkaPlanImg) throw new Error('AI Afiş arka planı üretilemedi. ' + (hatalar.join(' | ') || 'Gemini ya da OpenAI anahtarı gerekli.'));

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Gradient taban (AI görseli kenarları doldurmazsa boşluk kalmasın), sonra AI üstüne
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, palet.krem); base.addColorStop(1, '#e3ece8');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const ratio = Math.max(W / arkaPlanImg.width, H / arkaPlanImg.height);
  ctx.drawImage(arkaPlanImg, (W - arkaPlanImg.width * ratio) / 2, (H - arkaPlanImg.height * ratio) / 2,
    arkaPlanImg.width * ratio, arkaPlanImg.height * ratio);
  const topWash = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  topWash.addColorStop(0, 'rgba(244,241,233,0.82)');
  topWash.addColorStop(1, 'rgba(244,241,233,0)');
  ctx.fillStyle = topWash; ctx.fillRect(0, 0, W, H * 0.5);

  const M = Math.round(W * 0.06); // kenar boşluğu
  ctx.textAlign = 'left';

  // ── Kicker (üst etiket) ──
  ctx.fillStyle = palet.teal;
  ctx.font = `600 ${Math.round(W * 0.022)}px Arial`;
  const kicker = (palet.bgTema.includes('wellness')) ? 'SAĞLIKLI YAŞAM · GÜÇLÜ GİRİŞİM · AYDINLIK YARINLAR' : 'ONE TEAM ETKİNLİĞİ';
  ctx.fillText(kicker, M, Math.round(H * 0.07));

  // ── BAŞLIK (büyük, sol) ──
  ctx.fillStyle = palet.navy;
  const titleSize = Math.round(W * 0.082);
  ctx.font = `800 ${titleSize}px Arial`;
  let y = Math.round(H * 0.11) + titleSize;
  y = wrapText(ctx, (egitim.egitim || '').toLocaleUpperCase('tr-TR'), M, y, W - M * 2, titleSize * 1.02, 5);

  // ── Tarih + Saat pill ──
  const trS = egitim.saat || '';
  const trB = egitim.bitisSaati || '';
  const saatStr = trS ? `${trS}${trB ? ' - ' + trB : ''}` : '';
  const pillY = y + Math.round(H * 0.012);
  const pillH = Math.round(H * 0.05);
  ctx.fillStyle = palet.navy;
  roundRect(ctx, M, pillY, W - M * 2, pillH, pillH / 2); ctx.fill();
  ctx.fillStyle = palet.krem;
  ctx.font = `700 ${Math.round(pillH * 0.42)}px Arial`;
  ctx.textBaseline = 'middle';
  const tarihTxt = `${egitim.gun || ''} ${egitim.tarih || ''}`.trim();
  ctx.fillText('📅  ' + tarihTxt, M + pillH * 0.5, pillY + pillH / 2);
  if (saatStr) {
    ctx.textAlign = 'right';
    ctx.fillText(saatStr + '  🕐', W - M - pillH * 0.5, pillY + pillH / 2);
    ctx.textAlign = 'left';
  }
  ctx.textBaseline = 'alphabetic';

  // ── ZONE hesabı: alt logo bandını rezerve et, içerik asla taşmasın ──
  const fiziki = isFiziki(egitim);
  const adres = fiziki ? afisAdresKisa(egitim) : ''; // online'da çirkin Zoom ID kartı yok
  const bottomReserve = Math.round(H * 0.115); // alt logo bandı (logolariEkle buraya çizer)
  const gap = Math.round(H * 0.02);
  const contentTop = pillY + pillH + gap;
  const contentBottom = H - bottomReserve;
  const aH = adres ? Math.round(H * 0.10) : 0;        // adres kartı yüksekliği
  const speakersBottom = adres ? contentBottom - aH - gap : contentBottom;

  // ── KONUŞMACILAR (kart) — kalan dikey alana sığar ──
  const liste = (egitmenler || []).slice(0, 6);
  if (liste.length) {
    const dagilim = fotoYerlesim(liste.length);
    const cardX = M, cardW = W - M * 2;
    const cardY = contentTop;
    const rows = dagilim.length;
    const cardH = Math.max(Math.round(H * 0.14), speakersBottom - cardY);
    const perRowH = (cardH - Math.round(H * 0.02)) / rows;
    ctx.fillStyle = palet.navy;
    roundRect(ctx, cardX, cardY, cardW, cardH, Math.round(W * 0.03)); ctx.fill();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const adet = dagilim[r];
      const cellW = cardW / adet;
      const rowY = cardY + Math.round(H * 0.012) + r * perRowH;
      const foto = Math.min(Math.round(cellW * 0.46), Math.round(perRowH * 0.52));
      for (let c = 0; c < adet; c++, idx++) {
        const e = liste[idx];
        const cx = cardX + cellW * c + cellW / 2;
        const fy = rowY + foto / 2 + Math.round(perRowH * 0.06);
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = palet.teal; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, fy, foto / 2, 0, Math.PI * 2); ctx.clip();
        if (e.fotoURL) {
          try {
            const im = await urlToImage(e.fotoURL);
            const md = Math.min(im.width, im.height);
            ctx.drawImage(im, (im.width - md) / 2, (im.height - md) / 2, md, md, cx - foto / 2, fy - foto / 2, foto, foto);
          } catch { ctx.fillStyle = palet.krem; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        } else { ctx.fillStyle = palet.krem; ctx.fillRect(cx - foto / 2, fy - foto / 2, foto, foto); }
        ctx.restore();
        ctx.textAlign = 'center';
        // İsim — fotoğrafın altında net boşlukla (px-tabanlı, çakışma yok)
        const nameSize = Math.round(cellW * 0.072);
        ctx.fillStyle = palet.krem;
        ctx.font = `700 ${nameSize}px Arial`;
        const nameY = fy + foto / 2 + nameSize + 16;
        ctx.fillText((e.ad || '').toLocaleUpperCase('tr-TR'), cx, nameY, cellW * 0.94);
        // Etiket — ismin altında net boşlukla
        if (e.unvan) {
          const labelSize = Math.round(cellW * 0.054);
          ctx.fillStyle = palet.vurgu;
          ctx.font = `600 ${labelSize}px Arial`;
          ctx.fillText(e.unvan, cx, nameY + labelSize + 12, cellW * 0.94);
        }
        ctx.textAlign = 'left';
      }
    }
  }

  // ── ADRES kartı + QR (fiziki) — alt logo bandının hemen üstünde ──
  if (adres) {
    const aY = contentBottom - aH;
    ctx.fillStyle = palet.krem;
    roundRect(ctx, M, aY, W - M * 2, aH, Math.round(W * 0.025)); ctx.fill();
    // pin
    ctx.fillStyle = palet.teal;
    ctx.beginPath(); ctx.arc(M + aH * 0.42, aY + aH * 0.42, aH * 0.16, 0, Math.PI * 2); ctx.fill();
    // mekan + adres
    const tx = M + aH * 0.8;
    ctx.fillStyle = palet.navy;
    ctx.font = `800 ${Math.round(aH * 0.22)}px Arial`;
    ctx.fillText((egitim.mekanAdi || egitim.sehir || '').toLocaleUpperCase('tr-TR'), tx, aY + aH * 0.38, W - M * 2 - aH * 1.0 - (fiziki ? aH : 0));
    ctx.fillStyle = '#5a5a52';
    ctx.font = `400 ${Math.round(aH * 0.15)}px Arial`;
    wrapText(ctx, egitim.acikAdres || adres, tx, aY + aH * 0.62, W - M * 2 - aH * 1.0 - (fiziki ? aH * 1.2 : 0), aH * 0.18, 2);
    // QR
    if (fiziki) {
      const qr = await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`);
      if (qr) {
        try {
          const qi = await urlToImage(qr);
          const qs = aH * 0.74;
          ctx.drawImage(qi, W - M - qs - aH * 0.18, aY + (aH - qs) / 2, qs, qs);
        } catch {}
      }
    }
  }

  // ── Üst ortada OneTeam logosu ──
  try {
    const logo = await urlToImage('/logos/oneteam-logo.png');
    const lh = Math.round(H * 0.04);
    ctx.drawImage(logo, (W - lh * (logo.width / logo.height)) / 2, Math.round(H * 0.018), lh * (logo.width / logo.height), lh);
  } catch {}

  // Base64 → post-process logolar (alt) + döndür
  const dataUrl = canvas.toDataURL('image/png');
  const b64 = dataUrl.split(',')[1];
  return await logolariEkle({ base64: b64, mimeType: 'image/png' });
};
