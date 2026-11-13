// Görsel Stüdyo → "Şablonlu Afiş" kontrol paneli.
// Durum Stüdyo'da tutulur (canlı önizleme oradaki effect'le yenilenir); burası yalnız form.
import React from 'react';
import { Plus, X } from 'lucide-react';
import { SABLONLAR, RENK_HAZIR } from '../utils/gorselOlusturSablonAfis';

const GIRDI = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amare-purple/30';

export const BOS_KISI = () => ({ ad: '', unvan: '', fotoURL: null, gri: false, zoom: 1, ox: 0, oy: 0, odak: [50, 25] });

// Kişi sayısı şablona uyar: tek=1, söyleşi=2, panel=3-4
export const sablonaUydur = (kisiler, sablonId) => {
  const s = SABLONLAR.find(x => x.id === sablonId) || SABLONLAR[0];
  const yeni = kisiler.slice(0, s.max);
  while (yeni.length < s.min) yeni.push(BOS_KISI());
  return yeni;
};

export default function SablonAfisPaneli({ durum, guncelle, kadroBul }) {
  const { sablon, renk, tema, baslik, altBaslik, rozet, kisiler, tarih, saat, yer, sifre } = durum;
  const sab = SABLONLAR.find(s => s.id === sablon) || SABLONLAR[0];

  const kisiGuncelle = (i, patch) => guncelle({ kisiler: kisiler.map((k, idx) => idx === i ? { ...k, ...patch } : k) });

  const fotoSec = (i, file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) return;
    const eski = kisiler[i]?.fotoURL;
    if (eski && String(eski).startsWith('blob:')) { try { URL.revokeObjectURL(eski); } catch {} }
    // Yüklenen fotoğrafta yüz konumu bilinmez → üst-orta varsayılan; zoom/kaydırma ile elle ayarlanır.
    kisiGuncelle(i, { fotoURL: URL.createObjectURL(file), odak: [50, 28], zoom: 1, ox: 0, oy: 0 });
  };

  // Ad yazılıp alandan çıkılınca kadroda varsa fotoğraf + unvan otomatik gelir (foto zaten yüklüyse dokunmaz)
  const adBitti = (i) => {
    const k = kisiler[i];
    if (!k?.ad || k.fotoURL) return;
    const b = kadroBul?.(k.ad);
    if (b?.fotoURL) kisiGuncelle(i, { fotoURL: b.fotoURL, odak: b.odak || [50, 25], unvan: k.unvan || b.unvan || '' });
  };

  const kisiEkle = () => { if (kisiler.length < sab.max) guncelle({ kisiler: [...kisiler, BOS_KISI()] }); };
  const kisiSil = (i) => { if (kisiler.length > sab.min) guncelle({ kisiler: kisiler.filter((_, idx) => idx !== i) }); };

  return (
    <div className="space-y-4">
      {/* Şablon */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="text-xs font-bold text-gray-700 mb-2">🧩 Şablon</div>
        <div className="grid grid-cols-3 gap-2">
          {SABLONLAR.map(s => (
            <button key={s.id} onClick={() => guncelle({ sablon: s.id, kisiler: sablonaUydur(kisiler, s.id) })}
              className={`p-2 rounded-lg border-2 text-left text-xs transition ${sablon === s.id ? 'border-amare-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="font-bold">{s.ad}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s.not}</div>
            </button>
          ))}
        </div>

        {/* Renk */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Renk</span>
          {RENK_HAZIR.map(r => (
            <button key={r.renk} onClick={() => guncelle({ renk: r.renk })} title={r.ad}
              className={`w-6 h-6 rounded-full border-2 transition ${renk.toLowerCase() === r.renk ? 'border-gray-800 scale-110' : 'border-white ring-1 ring-gray-300'}`}
              style={{ background: r.renk }} />
          ))}
          <label className="inline-flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer" title="Kendi rengini seç">
            <input type="color" value={renk} onChange={(e) => guncelle({ renk: e.target.value })} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" />
            özel
          </label>
          <div className="ml-auto flex gap-1">
            {[{ k: 'acik', ad: 'Açık' }, { k: 'koyu', ad: 'Koyu' }].map(t => (
              <button key={t.k} onClick={() => guncelle({ tema: t.k })}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition ${tema === t.k ? 'border-amare-purple bg-purple-50 text-amare-purple' : 'border-gray-200 text-gray-600'}`}>{t.ad}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Yazılar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="text-xs font-bold text-gray-700">✏️ Yazılar</div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600">Büyük başlık <span className="font-normal text-gray-400">(Enter = alt satır)</span></label>
          <textarea value={baslik} onChange={(e) => guncelle({ baslik: e.target.value })} rows={2} maxLength={60} className={GIRDI + ' resize-y'} placeholder="RETORİK SANATI" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600">Alt başlık <span className="font-normal text-gray-400">(her satır ayrı · *yıldızlar arası* renkli çıkar)</span></label>
          <textarea value={altBaslik} onChange={(e) => guncelle({ altBaslik: e.target.value })} rows={3} maxLength={160} className={GIRDI + ' resize-y'}
            placeholder={'İletişim, İkna ve Beden Dili Üzerine\n*Oğuz Benlioğlu* ile Derin Bir Sohbete Hazır mısın?'} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600">Rozet <span className="font-normal text-gray-400">(boş = yok)</span></label>
          <input value={rozet} onChange={(e) => guncelle({ rozet: e.target.value })} maxLength={24} className={GIRDI} placeholder="SÖYLEŞİ" />
        </div>
      </div>

      {/* Kişiler */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">👤 Kişiler <span className="font-normal text-gray-400">({sab.ad}: {sab.not})</span></span>
          {kisiler.length < sab.max && (
            <button onClick={kisiEkle} className="text-[11px] text-amare-purple hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" /> kişi ekle</button>
          )}
        </div>
        {kisiler.map((k, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 space-y-2 relative">
            {kisiler.length > sab.min && (
              <button onClick={() => kisiSil(i)} title="Kişiyi çıkar" className="absolute top-1.5 right-1.5 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            )}
            <div className="flex gap-2 pr-5">
              <label className="w-16 h-20 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 hover:border-amare-purple overflow-hidden cursor-pointer flex items-center justify-center text-center text-[10px] text-gray-400 bg-gray-50"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); fotoSec(i, e.dataTransfer.files?.[0]); }}>
                {k.fotoURL
                  ? <img src={k.fotoURL} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${k.odak?.[0] ?? 50}% ${k.odak?.[1] ?? 25}%`, filter: k.gri ? 'grayscale(1)' : 'none' }} />
                  : <span>Foto<br />yükle</span>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { fotoSec(i, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input value={k.ad} onChange={(e) => kisiGuncelle(i, { ad: e.target.value })} onBlur={() => adBitti(i)} placeholder="Ad Soyad" className={GIRDI} />
                <input value={k.unvan} onChange={(e) => kisiGuncelle(i, { unvan: e.target.value })} placeholder="Unvan (örn. Yazar & Konuşmacı)" className={GIRDI} />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!k.gri} onChange={(e) => kisiGuncelle(i, { gri: e.target.checked })} /> Siyah-beyaz
                  </label>
                  {k.fotoURL && (
                    <button onClick={() => kisiGuncelle(i, { fotoURL: null })} className="text-[11px] text-gray-400 hover:text-red-500">fotoğrafı kaldır</button>
                  )}
                </div>
              </div>
            </div>
            {k.fotoURL && (
              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                <label>Yakınlaştır
                  <input type="range" min="1" max="2.6" step="0.05" value={k.zoom || 1} onChange={(e) => kisiGuncelle(i, { zoom: +e.target.value })} className="w-full" />
                </label>
                <label>Sağa–sola
                  <input type="range" min="-1" max="1" step="0.05" value={k.ox || 0} onChange={(e) => kisiGuncelle(i, { ox: +e.target.value })} className="w-full" />
                </label>
                <label>Yukarı–aşağı
                  <input type="range" min="-1" max="1" step="0.05" value={k.oy || 0} onChange={(e) => kisiGuncelle(i, { oy: +e.target.value })} className="w-full" />
                </label>
              </div>
            )}
          </div>
        ))}
        <p className="text-[10px] text-gray-400">Fotoğrafı kutuya tıklayıp seç ya da sürükle-bırak. Motor boy portre olarak kırpar; ad kadroda varsa foto kendiliğinden gelir.</p>
      </div>

      {/* Alt bilgi */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="text-xs font-bold text-gray-700">📍 Alt bilgi</div>
        <input value={tarih} onChange={(e) => guncelle({ tarih: e.target.value })} className={GIRDI} placeholder="4 Aralık Perşembe" />
        <div className="grid grid-cols-2 gap-2">
          <input value={saat} onChange={(e) => guncelle({ saat: e.target.value })} className={GIRDI} placeholder="21:00" />
          <input value={yer} onChange={(e) => guncelle({ yer: e.target.value })} className={GIRDI} placeholder="ZOOM 974 1282 9414" />
        </div>
        <input value={sifre} onChange={(e) => guncelle({ sifre: e.target.value })} className={GIRDI} placeholder="Şifre: 1111 (boş = yok)" />
      </div>
    </div>
  );
}
