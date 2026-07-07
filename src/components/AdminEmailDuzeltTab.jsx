// Admin: Email Düzeltme Talepleri
// Bozuk/eksik email Supabase'de olan kullanıcıların talep listesi.
// Admin onaylar → Supabase service_role ile güncellenir.

import React, { useEffect, useState } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Mail, Loader2, Check, X as XIcon, RotateCw, Phone, User, AlertCircle, CheckCircle2, Clock, Hash, ShieldCheck, ShieldAlert } from 'lucide-react';

const AdminEmailDuzeltTab = () => {
  const [talepler, setTalepler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('beklemede'); // beklemede | onaylandi | reddedildi | tumu
  const [islemTalepId, setIslemTalepId] = useState(null);
  const [sonIslem, setSonIslem] = useState(null);
  // Talep id → { bulundu, ad, amareId, email, phone, tip }
  const [dogrulamalar, setDogrulamalar] = useState({});
  const [dogrulaniyor, setDogrulaniyor] = useState(false);

  // ── Kimlik / Email Yönetim Konsolu (ID → tüm sistemlerde email → hepsine kaydet) ──
  const [kyId, setKyId] = useState('');
  const [kySonuc, setKySonuc] = useState(null);
  const [kyYeniEmail, setKyYeniEmail] = useState('');
  const [kyYukleniyor, setKyYukleniyor] = useState(false);
  const [kyKaydediliyor, setKyKaydediliyor] = useState(false);
  const [kyKayitSonuc, setKyKayitSonuc] = useState(null);
  const [kyHata, setKyHata] = useState('');
  const kyCall = async (payload) => {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/kimlik-email-yonet', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Hata (${res.status})`);
    return data;
  };
  const kyAra = async () => {
    if (!/^\d{4,12}$/.test(kyId.trim())) { setKyHata('Geçerli bir Amare ID gir (rakam).'); return; }
    setKyYukleniyor(true); setKyHata(''); setKySonuc(null); setKyKayitSonuc(null);
    try {
      const d = await kyCall({ mode: 'ara', amareId: kyId.trim() });
      setKySonuc(d);
      // varsayılan yeni email: mevcut (varsa kilitli, yoksa raw/crm) — admin düzenler
      const mevcut = d.kilit?.email || d.sistemler?.find(s => s.email)?.email || '';
      setKyYeniEmail(mevcut);
    } catch (e) { setKyHata(e.message); } finally { setKyYukleniyor(false); }
  };
  const kyKaydet = async () => {
    if (!kySonuc?.bulundu) return;
    setKyKaydediliyor(true); setKyHata('');
    try {
      const d = await kyCall({ mode: 'kaydet', amareId: kyId.trim(), yeniEmail: kyYeniEmail.trim() });
      setKyKayitSonuc(d);
      await kyAra(); // tabloyu tazele
    } catch (e) { setKyHata(e.message); } finally { setKyKaydediliyor(false); }
  };

  useEffect(() => {
    const q = query(collection(db, 'email_duzeltme_talepleri'), orderBy('olusturulmaTarihi', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTalepler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setYukleniyor(false);
    }, (err) => {
      console.warn('[email-duzelt] err:', err.message);
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  // Talepler değişince Supabase doğrulama isteği at (sadece beklemede olanlar için)
  useEffect(() => {
    if (talepler.length === 0) return;
    const beklemedeOlanlar = talepler.filter(t => t.durum === 'beklemede' && t.lookup);
    if (beklemedeOlanlar.length === 0) return;
    let iptal = false;
    (async () => {
      setDogrulaniyor(true);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/.netlify/functions/admin-talep-dogrula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lookups: beklemedeOlanlar.map(t => ({ id: t.id, lookup: t.lookup, telefon: t.telefon })),
          }),
        });
        if (!res.ok) throw new Error('Doğrulama başarısız');
        const data = await res.json();
        if (iptal) return;
        const map = {};
        (data.results || []).forEach(r => { map[r.id] = r; });
        setDogrulamalar(map);
      } catch (e) {
        console.warn('[email-duzelt-dogrula]:', e.message);
      } finally {
        if (!iptal) setDogrulaniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [talepler]);

  // Onaylanan talebine bildirim maili (tekil veya toplu)
  const [mailGonderiliyor, setMailGonderiliyor] = useState(null); // talepId | 'bulk' | null
  const mailGonder = async (talepId = null, tekrarGonder = false) => {
    const aciklama = talepId
      ? 'Bu talebe bilgilendirme maili gönderilecek. Devam edilsin mi?'
      : 'TÜM onaylanmış (mail gönderilmemiş) taleplere bilgilendirme maili gönderilecek. Devam edilsin mi?';
    if (!confirm(aciklama)) return;
    setMailGonderiliyor(talepId || 'bulk');
    setSonIslem(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/admin-onay-mail-backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ talepId, tekrarGonder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mail gönderim hatası');
      setSonIslem({
        ok: true,
        msg: talepId
          ? `📧 Mail gönderildi (${data.gonderilen}/${data.hedef})`
          : `📧 Toplu mail bitti — ${data.gonderilen}/${data.hedef} gönderildi${data.hatali > 0 ? ` · ${data.hatali} hata` : ''}`,
      });
    } catch (e) {
      setSonIslem({ ok: false, msg: '✗ ' + e.message });
    } finally {
      setMailGonderiliyor(null);
      setTimeout(() => setSonIslem(null), 6000);
    }
  };

  const islem = async (talepId, aksiyon, manuelAmareId = null) => {
    if (!manuelAmareId && !confirm(`Bu talep ${aksiyon === 'onayla' ? 'ONAYLANACAK ve Supabase güncellenecek' : 'REDDEDİLECEK'}. Emin misin?`)) return;
    setIslemTalepId(talepId);
    setSonIslem(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const body = { talepId, aksiyon };
      if (manuelAmareId) body.manuelAmareId = manuelAmareId;
      const res = await fetch('/.netlify/functions/admin-email-duzelt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // 2026-06-09: Backend "ID yok, manuel gir" derse: kullanıcıya prompt
        if (data.eksikField === 'amareId') {
          const elle = window.prompt(
            'Bu talepte Amare ID kayıtlı değil (eski form). Lütfen kullanıcının doğru Amare ID\'sini gir (6-10 rakam):',
            ''
          );
          if (elle && /^\d{6,10}$/.test(elle.trim())) {
            return islem(talepId, aksiyon, elle.trim()); // recurse — manuel ID ile yeniden dene
          }
          setSonIslem({ ok: false, msg: '✗ Geçerli ID girilmedi, işlem iptal' });
          return;
        }
        throw new Error(data.error || data.detail || 'İşlem hatası');
      }
      // 2026-06-09: Onaylandı ama Supabase'de 0 kayıt → ID yanlış olabilir
      if (data.durum === 'onaylandi-ama-eslesme-yok') {
        setSonIslem({
          ok: false,
          msg: `⚠ ${data.uyari} (kullanılan ID: ${data.kullanilanAmareId})`,
        });
        return;
      }
      setSonIslem({
        ok: true,
        msg: aksiyon === 'onayla'
          ? `✓ Onaylandı — ${data.guncellenenler} Supabase kaydı güncellendi${data.mailGonderildi ? ' · Bildirim emaili gönderildi 📧' : ''}`
          : '✓ Reddedildi',
      });
    } catch (e) {
      setSonIslem({ ok: false, msg: '✗ ' + e.message });
    } finally {
      setIslemTalepId(null);
      setTimeout(() => setSonIslem(null), 6000);
    }
  };

  const filtrelenmis = talepler.filter(t => filtre === 'tumu' || t.durum === filtre);

  const istatistik = {
    beklemede: talepler.filter(t => t.durum === 'beklemede').length,
    onaylandi: talepler.filter(t => t.durum === 'onaylandi').length,
    reddedildi: talepler.filter(t => t.durum === 'reddedildi').length,
  };

  if (yukleniyor) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Talepler yükleniyor...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* ── Kimlik / Email Yönetim Konsolu ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-amare-purple/20">
        <div className="flex items-center gap-3 mb-1">
          <Hash className="w-6 h-6 text-amare-purple" />
          <h2 className="text-xl font-bold text-gray-800">Kimlik / Email Yönetimi</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Amare ID gir → kişinin tüm sistemlerdeki email'ini gör, düzelt, <b>Hepsine Kaydet</b>. Kilitlenir, re-sync ezmez.</p>
        <div className="flex gap-2 flex-wrap items-center">
          <input value={kyId} onChange={e => setKyId(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && kyAra()}
            placeholder="Amare ID (örn. 727614)" inputMode="numeric"
            className="w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30" />
          <button onClick={kyAra} disabled={kyYukleniyor || !kyId.trim()}
            className="px-4 py-2 rounded-lg font-bold text-white bg-amare-purple hover:bg-amare-dark text-sm disabled:opacity-40 inline-flex items-center gap-1.5">
            {kyYukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />} Ara
          </button>
        </div>
        {kyHata && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-1.5"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{kyHata}</div>}
        {kySonuc && !kySonuc.bulundu && (
          <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Bu Amare ID hiçbir sistemde bulunamadı ({kySonuc.amareId}).</div>
        )}
        {kySonuc?.bulundu && (
          <div className="mt-4 space-y-3">
            <div className="text-sm"><span className="text-gray-500">Kişi:</span> <b className="text-gray-800">{kySonuc.isim || '—'}</b> <span className="text-gray-400">· ID {kySonuc.amareId}</span></div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="text-left px-3 py-2">Sistem</th><th className="text-left px-3 py-2">Mevcut Email</th><th className="text-left px-3 py-2">Durum</th></tr></thead>
                <tbody>
                  {kySonuc.sistemler.map(s => (
                    <tr key={s.anahtar} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-semibold text-gray-700">{s.ad}</td>
                      <td className="px-3 py-2 text-gray-600 break-all">{s.email || <span className="text-gray-300">— boş —</span>}</td>
                      <td className="px-3 py-2">
                        {!s.kayitVar ? <span className="text-[11px] text-gray-400">kayıt yok</span>
                          : s.resyncEzer ? <span className="text-[11px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">re-sync ezer → kilit şart</span>
                          : <span className="text-[11px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">kalıcı</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {kySonuc.kilit && <div className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 flex-wrap"><ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" /><span>Bu e-posta <b>kilitli</b> (re-sync ezmez): <b>{kySonuc.kilit.email}</b></span>{kySonuc.kilit.duzelten && <span className="text-purple-400">— kilitleyen: {kySonuc.kilit.duzelten}</span>}</div>}
            <div className="flex gap-2 flex-wrap items-center pt-1">
              <input value={kyYeniEmail} onChange={e => setKyYeniEmail(e.target.value)} type="email" placeholder="doğru@email.com"
                className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              <button onClick={kyKaydet} disabled={kyKaydediliyor || !kyYeniEmail.trim()}
                className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 text-sm disabled:opacity-40 inline-flex items-center gap-1.5">
                {kyKaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Hepsine Kaydet
              </button>
            </div>
            {kyKayitSonuc && (
              <div className={`text-sm rounded-lg p-3 border ${kyKayitSonuc.ok ? 'text-green-800 bg-green-50 border-green-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                <div className="font-bold flex items-center gap-1.5">{kyKayitSonuc.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{kyKayitSonuc.mesaj}</div>
                <div className="text-xs mt-1 text-gray-600">Kilit: {String(kyKayitSonuc.sonuc?.kilit)} · Eğitim Takvimi: {kyKayitSonuc.sonuc?.['Eğitim Takvimi']} · CRM/HBB/Vizyon: {kyKayitSonuc.sonuc?.['CRM/HBB/Vizyon']}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-amare-purple" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Email Düzeltme Talepleri</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Kullanıcı email'i Supabase'de bozuk/yok ise buradan talep eder. Onayda Supabase güncellenir.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Toplam: <strong>{talepler.length}</strong></span>
            {istatistik.beklemede > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                {istatistik.beklemede} bekleyen
              </span>
            )}
          </div>
        </div>

        {/* Filtre chip'leri */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { kod: 'beklemede', label: `Beklemede (${istatistik.beklemede})`, renk: 'amber' },
            { kod: 'onaylandi', label: `Onaylanan (${istatistik.onaylandi})`, renk: 'emerald' },
            { kod: 'reddedildi', label: `Reddedilen (${istatistik.reddedildi})`, renk: 'rose' },
            { kod: 'tumu', label: 'Tümü', renk: 'slate' },
          ].map(f => {
            const aktif = filtre === f.kod;
            const aktifRenk = {
              amber: 'bg-amber-500 text-white',
              emerald: 'bg-emerald-500 text-white',
              rose: 'bg-rose-500 text-white',
              slate: 'bg-gray-700 text-white',
            }[f.renk];
            return (
              <button key={f.kod} onClick={() => setFiltre(f.kod)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  aktif ? aktifRenk + ' shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            );
          })}
          {/* Toplu mail butonu — Onaylanan tab'da görünür */}
          {filtre === 'onaylandi' && istatistik.onaylandi > 0 && (
            <button onClick={() => mailGonder(null)} disabled={mailGonderiliyor === 'bulk'}
              className="ml-auto inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition disabled:opacity-50">
              {mailGonderiliyor === 'bulk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Tümüne Toplu Bildirim
            </button>
          )}
        </div>

        {/* Son işlem mesajı */}
        {sonIslem && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            sonIslem.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {sonIslem.msg}
          </div>
        )}

        {/* Liste */}
        {filtrelenmis.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>{filtre === 'beklemede' ? 'Bekleyen talep yok 🎉' : 'Bu filtrede talep yok'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrelenmis.map(t => {
              const tarih = t.olusturulmaTarihi?.toDate?.()
                ? t.olusturulmaTarihi.toDate().toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';
              const durumRenk = {
                beklemede: 'bg-amber-100 text-amber-800 border-amber-300',
                onaylandi: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                reddedildi: 'bg-rose-100 text-rose-800 border-rose-300',
              }[t.durum] || 'bg-gray-100 text-gray-700 border-gray-300';

              return (
                <div key={t.id} className={`bg-gray-50 border-2 ${durumRenk.split(' ').pop()} rounded-xl p-4`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${durumRenk}`}>
                          {t.durum}
                        </span>
                        <span className="text-gray-500 text-xs inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />{tarih}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-800">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <strong>{t.ad}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Hash className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-mono text-xs">{t.lookup || '—'}</span>
                          {t.telefon && (
                            <>
                              <Phone className="w-3.5 h-3.5 text-gray-500 ml-2" />
                              <span className="font-mono text-xs">{t.telefon}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-amare-purple font-bold">
                          <Mail className="w-3.5 h-3.5" />
                          {t.yeniEmail}
                        </div>
                        {/* Supabase doğrulama bandı — sadece beklemedeki talepler için */}
                        {t.durum === 'beklemede' && (() => {
                          const d = dogrulamalar[t.id];
                          if (!d) {
                            return (
                              <div className="mt-1 inline-flex items-center gap-1.5 text-gray-400 text-[11px]">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Supabase doğrulanıyor...
                              </div>
                            );
                          }
                          if (d.bulundu) {
                            // Talep eden ad ile Supabase ad eşleşiyor mu? Basit kontrol
                            const talepAd = (t.ad || '').toLocaleUpperCase('tr-TR').trim();
                            const supaAd = (d.ad || '').toLocaleUpperCase('tr-TR').trim();
                            const adEsleşiyor = talepAd && supaAd && (
                              supaAd.includes(talepAd.split(' ')[0]) ||
                              talepAd.includes(supaAd.split(' ')[0])
                            );
                            return (
                              <div className={`mt-2 rounded-lg border p-2 text-[11px] ${
                                adEsleşiyor ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'
                              }`}>
                                <div className="flex items-start gap-1.5">
                                  {adEsleşiyor ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-bold ${adEsleşiyor ? 'text-emerald-800' : 'text-amber-800'}`}>
                                      {adEsleşiyor ? 'Supabase kaydı eşleşti' : 'Ad farklı — kontrol et'}
                                    </div>
                                    <div className="text-gray-700 mt-0.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                                      <span><strong>Ad:</strong> {d.ad}</span>
                                      <span><strong>ID:</strong> <span className="font-mono">{d.amareId}</span></span>
                                      {d.email && <span className="truncate"><strong>Email:</strong> {d.email}</span>}
                                      {d.phone && <span><strong>Tel:</strong> <span className="font-mono">{d.phone}</span></span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-[11px]">
                              <div className="flex items-start gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold text-rose-800">Supabase'de bulunamadı</div>
                                  <div className="text-rose-700 mt-0.5">
                                    Bu {d.tip === 'amareId' ? 'AmareID' : d.tip === 'phone' ? 'telefon' : d.tip === 'email' ? 'email' : 'bilgi'} amare_raw_members'ta kayıtlı değil. Onaylama Supabase'de hiçbir kayıt güncellemez.
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {t.sebep && (
                          <div className="text-gray-600 text-xs italic pl-5 pt-1 border-l-2 border-gray-300">
                            "{t.sebep}"
                          </div>
                        )}
                        {t.durum !== 'beklemede' && t.islemYapan && (
                          <div className="text-gray-500 text-[11px] pl-5 pt-1">
                            İşlem: {t.islemYapan}
                            {t.guncellenenKayitSayisi != null && ` · ${t.guncellenenKayitSayisi} Supabase kaydı güncellendi`}
                            {t.onayMailGonderildi === true && ` · 📧 Bildirim maili gönderildi`}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Aksiyon butonları */}
                    {t.durum === 'onaylandi' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {t.onayMailGonderildi === true ? (
                          <button onClick={() => mailGonder(t.id, true)} disabled={mailGonderiliyor === t.id}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50 border border-gray-300"
                            title="Tekrar gönder">
                            {mailGonderiliyor === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                            Tekrar Yolla
                          </button>
                        ) : (
                          <button onClick={() => mailGonder(t.id, false)} disabled={mailGonderiliyor === t.id}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                            {mailGonderiliyor === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            Mail Yolla
                          </button>
                        )}
                      </div>
                    )}
                    {t.durum === 'beklemede' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => islem(t.id, 'reddet')} disabled={islemTalepId === t.id}
                          className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                          <XIcon className="w-3.5 h-3.5" /> Reddet
                        </button>
                        <button onClick={() => islem(t.id, 'onayla')} disabled={islemTalepId === t.id}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
                          {islemTalepId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Onayla
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmailDuzeltTab;
