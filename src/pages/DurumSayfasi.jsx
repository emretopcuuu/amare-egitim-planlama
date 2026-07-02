// /durum — Sistem sağlık sayfası.
// "Site mi bozuk, bende mi sorun?" sorusunu 5 saniyede cevaplar:
// Firestore (veri), Netlify Functions (backend), Supabase (üye verisi) ayakta mı?
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, RotateCw, Activity } from 'lucide-react';
import { useDocumentTitle } from '../utils/useDocumentTitle';

const KONTROLLER = [
  {
    key: 'firestore', ad: 'Veritabanı (Firestore)', desc: 'Takvim, eğitmenler, kayıtlı eğitimler',
    test: async () => {
      const r = await fetch('https://firestore.googleapis.com/v1/projects/amare-egitim-planlama/databases/(default)/documents/settings?pageSize=1');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
  },
  {
    key: 'proxy', ad: 'Veri Proxy (kendi sunucumuz)', desc: 'Veritabanına doğrudan erişilemezse devreye giren yedek yol',
    test: async () => {
      const r = await fetch('/.netlify/functions/veri-proxy?col=settings');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
  },
  {
    key: 'functions', ad: 'Backend (Netlify Functions)', desc: 'Formlar, bildirimler, kısa linkler',
    test: async () => {
      // kisalt fonksiyonu geçersiz kodda bile cevap verir — 5xx değilse ayakta
      const r = await fetch('/.netlify/functions/kisalt?kod=durumtest');
      if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
    },
  },
  {
    key: 'supabase', ad: 'Üye Verisi (Supabase)', desc: 'Üye girişi, ekip ağacı, e-posta doğrulama',
    test: async () => {
      // anon istek 401 döner = servis ayakta; 5xx / ağ hatası = sorun
      const r = await fetch('https://yvpstkbwglefxukfpgyd.supabase.co/rest/v1/', { method: 'HEAD' }).catch(() => null);
      if (!r || r.status >= 500) throw new Error(r ? `HTTP ${r.status}` : 'erişilemedi');
    },
  },
];

export default function DurumSayfasi() {
  useDocumentTitle('Sistem Durumu', 'Servis sağlık kontrolü');
  const [sonuclar, setSonuclar] = useState({}); // key -> { durum: 'ok'|'hata'|'test', ms, hata }
  const [calisiyor, setCalisiyor] = useState(false);

  const calistir = async () => {
    setCalisiyor(true);
    setSonuclar(Object.fromEntries(KONTROLLER.map(k => [k.key, { durum: 'test' }])));
    await Promise.all(KONTROLLER.map(async (k) => {
      const t0 = performance.now();
      try {
        await k.test();
        setSonuclar(s => ({ ...s, [k.key]: { durum: 'ok', ms: Math.round(performance.now() - t0) } }));
      } catch (e) {
        setSonuclar(s => ({ ...s, [k.key]: { durum: 'hata', ms: Math.round(performance.now() - t0), hata: e?.message } }));
      }
    }));
    setCalisiyor(false);
  };

  useEffect(() => { calistir(); }, []);

  const hepsi = KONTROLLER.every(k => sonuclar[k.key]?.durum === 'ok');
  const hataVar = KONTROLLER.some(k => sonuclar[k.key]?.durum === 'hata');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6"><ArrowLeft className="w-4 h-4" />Ana Sayfa</Link>
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-7 h-7 text-amber-300" />
          <h1 className="text-2xl font-extrabold">Sistem Durumu</h1>
        </div>
        <p className="text-purple-200/70 text-sm mb-6">Sayfalar boş görünüyorsa önce buraya bak: servisler ayakta mı?</p>

        {/* Genel durum bandı */}
        <div className={`rounded-2xl p-4 mb-5 border font-bold flex items-center gap-2 ${
          calisiyor ? 'bg-white/5 border-white/15 text-white/70'
          : hepsi ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
          : hataVar ? 'bg-red-500/15 border-red-400/50 text-red-200'
          : 'bg-white/5 border-white/15 text-white/70'}`}>
          {calisiyor ? <><Loader2 className="w-5 h-5 animate-spin" />Kontrol ediliyor…</>
            : hepsi ? <><CheckCircle2 className="w-5 h-5" />Tüm sistemler çalışıyor</>
            : <><XCircle className="w-5 h-5" />Bir veya daha fazla serviste sorun var</>}
        </div>

        <div className="space-y-3">
          {KONTROLLER.map(k => {
            const s = sonuclar[k.key];
            return (
              <div key={k.key} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  {!s || s.durum === 'test' ? <Loader2 className="w-6 h-6 text-amber-300 animate-spin" />
                    : s.durum === 'ok' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    : <XCircle className="w-6 h-6 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{k.ad}</div>
                  <div className="text-xs text-purple-200/60">{k.desc}</div>
                  {s?.durum === 'hata' && <div className="text-xs text-red-300 mt-1">Hata: {s.hata}</div>}
                </div>
                {s?.ms != null && s.durum !== 'test' && <div className={`text-xs font-mono flex-shrink-0 ${s.durum === 'ok' ? 'text-emerald-300/80' : 'text-red-300/80'}`}>{s.ms} ms</div>}
              </div>
            );
          })}
        </div>

        <button onClick={calistir} disabled={calisiyor}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-purple-900 font-bold py-3 rounded-xl disabled:opacity-50 spring-tap">
          <RotateCw className={`w-4 h-4 ${calisiyor ? 'animate-spin' : ''}`} />Tekrar Test Et
        </button>

        <p className="text-purple-300/40 text-[11px] mt-4 text-center">Servisler yeşilse ama sayfa hâlâ boşsa: Ctrl+Shift+R ile sert yenile. Sorun sürerse yöneticinle paylaş: bu sayfanın ekran görüntüsü yeterli.</p>
      </div>
    </div>
  );
}
