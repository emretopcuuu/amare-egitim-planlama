// netlify/functions/kimlik-email-yonet.mjs   (Auth: admin Bearer ID token)
// ─────────────────────────────────────────────────────────────────────────
// Kimlik/Email yönetim konsolu — bir kişinin email'ini TÜM sistemlerde gör + düzelt.
//   POST { mode:'ara', amareId }
//     → amare_raw_members / crm_members / email_overrides'taki email'i döner (durumla).
//   POST { mode:'kaydet', amareId, yeniEmail }
//     → email_overrides'a KİLİTLER (scraper ezmesin) + amare_raw_members.email +
//       crm_members.email PATCH + HBB/Supabase auth kullanıcısı → tüm sistemlerde
//       kalıcı düzeltme.
//   POST { mode:'maske-temizle' }
//     → amare_raw_members / crm_members'taki maskeli ("*****") email+telefon
//       değerlerini NULL'a çeker (bkz. MASKE notu aşağıda).
//
// Hepsi tek Supabase projesinde (yvpstkbwglefxukfpgyd). service-role, RLS bypass.
// email_overrides: scraper upsert sonrası amare_raw_members'a geri uygular (kalıcılık).
// ─────────────────────────────────────────────────────────────────────────
import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SB_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const jr = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// MASKE: Amare back office bazı kayıtların email/telefonunu maskeleyerek ("*****")
// gösteriyor; scraper bunu DÜZ METİN olarak yazıyor. Sonuç: kayıt "email'i var" gibi
// görünür ama hiçbir eşleşmeye girmez ve kimse sorunu fark etmez (Oğuzcan Çiftçi
// vakası, 3 Ağu 2026 — ID 2051852'de email='*****'). Maskeli değer = veri YOK.
const MASKE_RE = /^\*+$/;
const maskeliMi = (v) => MASKE_RE.test(String(v ?? '').trim());
const maskesiz = (v) => { const s = String(v ?? '').trim(); return (!s || maskeliMi(s)) ? null : s; };

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) return [];
  return r.json().catch(() => []);
}
async function sbPatch(table, amareId, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?amare_id=eq.${encodeURIComponent(amareId)}`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => []);
  return { ok: r.ok, adet: Array.isArray(data) ? data.length : 0, status: r.status };
}
async function sbUpsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status };
}
// Serbest filtreli PATCH (maske temizliği için) — filtre PostgREST sorgu dizesi.
async function sbPatchFiltre(table, filtre, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${filtre}`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => []);
  return { ok: r.ok, adet: Array.isArray(data) ? data.length : 0 };
}

// ── HBB / Supabase auth ────────────────────────────────────────────────────
// HBB girişi signInWithOtp({ shouldCreateUser:false }) ile çalışıyor: email auth'ta
// KAYITLI DEĞİLSE Supabase kod GÖNDERMEZ ve kullanıcı "kod gelmiyor" der (sessiz
// başarısızlık). Bu yüzden email'i düzeltirken auth kullanıcısını da açıyoruz —
// yoksa düzeltme "kaydedildi" görünür ama kişi yine giremez.
async function authKullaniciVar(email) {
  if (!email) return null;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`, { headers: sbHeaders });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!Array.isArray(j?.users)) return null;
    return j.users.some(u => String(u.email || '').toLowerCase() === email.toLowerCase());
  } catch { return null; }
}
async function authKullaniciOlustur(email) {
  try {
    const r = await fetch(`${SB_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ email, email_confirm: true }),
    });
    if (r.ok) return { ok: true, durum: 'oluşturuldu' };
    const j = await r.json().catch(() => ({}));
    const mesaj = String(j.error_code || j.msg || j.message || j.error || '');
    // Zaten kayıtlıysa GoTrue 422 döner — bu bir hata değil, istenen son durum.
    if (r.status === 422 || /exist|registered|duplicate/i.test(mesaj)) return { ok: true, durum: 'zaten vardı' };
    return { ok: false, durum: `HATA (${r.status})` };
  } catch (e) { return { ok: false, durum: 'HATA' }; }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jr({ error: 'POST only' }, 405);

  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return jr({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); } catch { return jr({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jr({ error: 'Admin yetkisi yok' }, 403);
  if (!SB_KEY) return jr({ error: 'Supabase yapılandırması eksik' }, 500);

  let body;
  try { body = await req.json(); } catch { return jr({ error: 'Geçersiz gövde' }, 400); }

  // Faz 2 — serbest arama: email / telefon / isim → aday listesi (ID'yi bilmeden bul)
  if (body.mode === 'bul') {
    const q = String(body.q || '').trim();
    if (q.length < 3) return jr({ error: 'En az 3 karakter gir.' }, 400);
    const SELECT = 'amare_id,full_name,email,phone';
    let filter;
    if (q.includes('@')) {
      filter = `email=ilike.${encodeURIComponent('*' + q + '*')}`;
    } else if (/^[\d\s+()-]+$/.test(q) && q.replace(/\D/g, '').length >= 7) {
      // Telefon: DB'de +90/0090/0 önekleri karışık → son 10 hane suffix eşleşmesi
      const rakamlar = q.replace(/\D/g, '').slice(-10);
      filter = `phone=ilike.${encodeURIComponent('*' + rakamlar)}`;
    } else {
      filter = `full_name=ilike.${encodeURIComponent('*' + q + '*')}`;
    }
    const [raw, crm] = await Promise.all([
      sbGet(`amare_raw_members?${filter}&select=${SELECT}&limit=15`),
      sbGet(`crm_members?${filter}&select=${SELECT}&limit=15`),
    ]);
    const map = new Map();
    [...raw, ...crm].forEach(r => {
      const id = String(r.amare_id || '');
      if (id && !map.has(id)) map.set(id, {
        amareId: id, isim: r.full_name || '', email: maskesiz(r.email) || '',
        telefonSon4: String(maskesiz(r.phone) || '').replace(/\D/g, '').slice(-4),
      });
    });
    return jr({ adaylar: [...map.values()].slice(0, 20) });
  }

  // Maske temizliği — ID gerektirmez. Scraper'ın düz metin yazdığı "*****" değerlerini
  // NULL'a çeker; idempotent, her re-sync sonrası tekrar çalıştırılabilir.
  if (body.mode === 'maske-temizle') {
    const maskeFiltre = (kolon) => `${kolon}=eq.${encodeURIComponent('*****')}`;
    const [re, rp, ce, cp] = await Promise.all([
      sbPatchFiltre('amare_raw_members', maskeFiltre('email'), { email: null }),
      sbPatchFiltre('amare_raw_members', maskeFiltre('phone'), { phone: null }),
      sbPatchFiltre('crm_members', maskeFiltre('email'), { email: null }),
      sbPatchFiltre('crm_members', maskeFiltre('phone'), { phone: null }),
    ]);
    const hepsiOk = re.ok && rp.ok && ce.ok && cp.ok;
    const toplam = re.adet + rp.adet + ce.adet + cp.adet;
    return jr({
      ok: hepsiOk, toplam,
      sonuc: {
        'amare_raw_members.email': re.ok ? re.adet : 'HATA',
        'amare_raw_members.phone': rp.ok ? rp.adet : 'HATA',
        'crm_members.email': ce.ok ? ce.adet : 'HATA',
        'crm_members.phone': cp.ok ? cp.adet : 'HATA',
      },
      mesaj: hepsiOk
        ? (toplam ? `${toplam} maskeli değer temizlendi (NULL).` : 'Maskeli kayıt yok — temiz.')
        : 'Bazı temizlikler başarısız — sonucu kontrol et.',
    }, hepsiOk ? 200 : 207);
  }

  const amareId = String(body.amareId || '').trim();
  if (!/^\d{4,12}$/.test(amareId)) return jr({ error: 'Geçerli bir Amare ID gir (rakam).' }, 400);

  if (body.mode === 'ara') {
    const [raw, crm, ov] = await Promise.all([
      sbGet(`amare_raw_members?amare_id=eq.${amareId}&select=amare_id,email,full_name&limit=1`),
      sbGet(`crm_members?amare_id=eq.${amareId}&select=amare_id,email,full_name&limit=1`),
      sbGet(`email_overrides?amare_id=eq.${amareId}&select=email,updated_at,duzelten&limit=1`),
    ]);
    const isim = raw[0]?.full_name || crm[0]?.full_name || '';
    if (!raw.length && !crm.length) return jr({ bulundu: false, amareId, isim: '', sistemler: [] });
    // Maskeli değer email DEĞİLDİR: email null döner, ayrı `maskeli` bayrağı UI'da
    // "🙈 maskeli — gerçek email yok" rozetini gösterir.
    const gecerliEmail = maskesiz(ov[0]?.email) || maskesiz(raw[0]?.email) || maskesiz(crm[0]?.email);
    return jr({
      bulundu: true, amareId, isim,
      sistemler: [
        { anahtar: 'amare_raw_members', ad: 'Eğitim Takvimi / Giriş', email: maskesiz(raw[0]?.email), maskeli: maskeliMi(raw[0]?.email), kayitVar: !!raw.length, resyncEzer: true },
        { anahtar: 'crm_members', ad: 'CRM · HBB · Vizyon', email: maskesiz(crm[0]?.email), maskeli: maskeliMi(crm[0]?.email), kayitVar: !!crm.length, resyncEzer: false },
      ],
      kilit: ov[0] ? { email: ov[0].email, tarih: ov[0].updated_at, duzelten: ov[0].duzelten } : null,
      // HBB/asistan/90gün girişi bu email auth'ta kayıtlıysa çalışır (null = kontrol edilemedi)
      girisHesabi: { email: gecerliEmail || null, var: gecerliEmail ? await authKullaniciVar(gecerliEmail) : null },
    });
  }

  if (body.mode === 'kaydet') {
    const yeniEmail = String(body.yeniEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(yeniEmail)) return jr({ error: 'Geçerli bir email gir.' }, 400);

    // mevcut değerler (eski_email + isim, audit için)
    const [raw, crm] = await Promise.all([
      sbGet(`amare_raw_members?amare_id=eq.${amareId}&select=email,full_name&limit=1`),
      sbGet(`crm_members?amare_id=eq.${amareId}&select=email&limit=1`),
    ]);
    if (!raw.length && !crm.length) return jr({ error: 'Bu Amare ID hiçbir tabloda bulunamadı.' }, 404);
    // Maskeli değer audit'e "eski email" olarak yazılmaz — o bir adres değil, maske.
    const eskiEmail = maskesiz(raw[0]?.email) || maskesiz(crm[0]?.email) || null;

    // 1) email_overrides KİLİT (scraper ezmesin) — kalıcılık anahtarı
    const ovRes = await sbUpsert('email_overrides', {
      amare_id: amareId, email: yeniEmail, eski_email: eskiEmail,
      duzelten: decoded.email || 'admin', kaynak: 'admin-kimlik-yonet', updated_at: new Date().toISOString(),
    });
    // 2) amare_raw_members.email (giriş)
    const rawRes = raw.length ? await sbPatch('amare_raw_members', amareId, { email: yeniEmail }) : { ok: true, adet: 0 };
    // 3) crm_members.email (CRM/HBB/Vizyon) — kayıt varsa
    const crmRes = crm.length ? await sbPatch('crm_members', amareId, { email: yeniEmail }) : { ok: true, adet: 0 };
    // 4) HBB/Supabase auth kullanıcısı — bu olmadan kişi "kod gelmiyor" der (yukarıdaki nota bak)
    const authRes = await authKullaniciOlustur(yeniEmail);

    // audit (Firestore — mevcut audit deseni)
    try {
      await admin.firestore().collection('kimlik_email_log').add({
        amareId, eskiEmail, yeniEmail, duzelten: decoded.email || null,
        raw: rawRes.ok, crm: crmRes.ok, override: ovRes.ok, auth: authRes.durum,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}

    const basarili = ovRes.ok && rawRes.ok && crmRes.ok && authRes.ok;
    return jr({
      ok: basarili, amareId, yeniEmail, eskiEmail,
      sonuc: {
        kilit: ovRes.ok, 'Eğitim Takvimi': rawRes.ok ? (rawRes.adet ? 'güncellendi' : 'kayıt yok') : 'HATA',
        'CRM/HBB/Vizyon': crmRes.ok ? (crmRes.adet ? 'güncellendi' : 'kayıt yok') : 'HATA',
        'HBB Girişi': authRes.durum,
      },
      mesaj: basarili ? 'Tüm sistemlerde güncellendi + kilitlendi (re-sync ezmez) + giriş hesabı hazır.' : 'Bazı yazımlar başarısız — sonucu kontrol et.',
    }, basarili ? 200 : 207);
  }

  return jr({ error: 'Bilinmeyen mode' }, 400);
};
