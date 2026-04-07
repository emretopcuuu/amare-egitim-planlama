import React, { useState } from 'react';
import { X, Bell, Phone, Mail, MessageCircle, Loader2, RefreshCw, Copy, Check } from 'lucide-react';

const temizleTelefon = (telefon) => {
  if (!telefon) return null;
  let t = telefon.replace(/[\s\-\(\)\.]/g, '');
  if (t.startsWith('+')) t = t.slice(1);
  if (t.startsWith('00')) t = t.slice(2);
  if (t.startsWith('0') && t.length === 11) t = '90' + t.slice(1);
  if (t.length === 10 && t.startsWith('5')) t = '90' + t;
  return t.length >= 10 ? t : null;
};

const bugununYarini = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const gun = String(d.getDate()).padStart(2, '0');
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const yil = d.getFullYear();
  return `${gun}.${ay}.${yil}`;
};

const HatirlatmaModal = ({ takvim, egitmenler, apiKey, onClose }) => {
  const [secilenTarih, setSecilenTarih] = useState(bugununYarini());
  const [mesajlar, setMesajlar] = useState({});
  const [yukleniyor, setYukleniyor] = useState({});
  const [hatalar, setHatalar] = useState({});
  const [kopyalandi, setKopyalandi] = useState({});

  const gununEgitimleri = takvim
    .filter(e => e.tarih === secilenTarih)
    .sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));

  const egitmenBul = (egitimEgitmen) => {
    if (!egitimEgitmen) return [];
    const adlar = egitimEgitmen.split(/[\/,]/).map(n => n.trim()).filter(Boolean);
    return adlar.map(ad => {
      const bulunan = egitmenler.find(e =>
        e.adSoyad?.toLowerCase().includes(ad.toLowerCase().split(' ')[0]) ||
        ad.toLowerCase().includes((e.adSoyad || '').toLowerCase().split(' ')[0])
      );
      return { ad, egitmen: bulunan || null };
    });
  };

  const handleMesajUret = async (egitim) => {
    if (!apiKey) {
      setHatalar(h => ({ ...h, [egitim.id]: 'API anahtarı eksik. Ayarlardan ekleyin.' }));
      return;
    }
    setYukleniyor(y => ({ ...y, [egitim.id]: true }));
    setHatalar(h => ({ ...h, [egitim.id]: null }));

    const prompt = `Yarın gerçekleşecek bir eğitim etkinliği için katılımcılara WhatsApp üzerinden gönderilecek Türkçe bir hatırlatma mesajı yaz.
Samimi, sıcak ve motive edici bir dil kullan. Kısa olsun (2-3 cümle). Emoji kullan. ONE TEAM ruhunu yansıt.
Sadece mesaj metnini yaz, başka açıklama ekleme.

ETKİNLİK:
- Eğitim: ${egitim.egitim}
- Tarih: ${egitim.tarih} ${egitim.gun || ''}
- Saat: ${egitim.saat}${egitim.bitisSaati ? ' - ' + egitim.bitisSaati : ''}
- Platform: ${egitim.yer || 'ZOOM'}${egitim.egitmen ? '\n- Konuşmacı: ' + egitim.egitmen : ''}${egitim.kategori ? '\n- Kategori: ' + egitim.kategori : ''}`;

    try {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 },
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `API Hatası: ${res.status}`); }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('API metin döndürmedi.');
      setMesajlar(m => ({ ...m, [egitim.id]: text }));
    } catch (err) {
      setHatalar(h => ({ ...h, [egitim.id]: err.message }));
    } finally {
      setYukleniyor(y => ({ ...y, [egitim.id]: false }));
    }
  };

  const handleKopyala = (key, metin) => {
    navigator.clipboard.writeText(metin);
    setKopyalandi(k => ({ ...k, [key]: true }));
    setTimeout(() => setKopyalandi(k => ({ ...k, [key]: false })), 2000);
  };

  const varsayilanMesaj = (egitim) =>
    `Merhaba! 👋 Yarın ${egitim.tarih} tarihinde saat ${egitim.saat}'de "${egitim.egitim}" eğitimimizi hatırlatmak istedik. ${egitim.egitmen ? egitim.egitmen + ' ile ✨ ' : ''}Görüşmek üzere! 🎯 ONE TEAM 💜`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hatırlatma Mesajı Gönder</h2>
            <p className="text-sm text-gray-500 mt-0.5">Eğitim günü öncesi liderlerle paylaşın</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tarih seçimi */}
          <div className="flex items-center gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Eğitim Tarihi</label>
              <input
                type="text"
                value={secilenTarih}
                onChange={e => setSecilenTarih(e.target.value)}
                placeholder="GG.AA.YYYY"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30 w-40"
              />
            </div>
            <div className="mt-5 text-xs text-gray-400">Varsayılan: yarın ({bugununYarini()})</div>
          </div>

          {gununEgitimleri.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{secilenTarih} tarihinde planlanmış eğitim bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-5">
              {gununEgitimleri.map(egitim => {
                const konusmacilar = egitmenBul(egitim.egitmen);
                const mesaj = mesajlar[egitim.id];
                const yuklYap = yukleniyor[egitim.id];
                const hata = hatalar[egitim.id];
                const aktifMesaj = mesaj || varsayilanMesaj(egitim);
                const tumTelefonlular = egitmenler.filter(e => temizleTelefon(e.telefon));

                return (
                  <div key={egitim.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Eğitim başlığı */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-5 py-3 border-b border-purple-100">
                      <div className="font-bold text-amare-purple">{egitim.egitim}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                        <span>🕐 {egitim.saat}{egitim.bitisSaati ? ` - ${egitim.bitisSaati}` : ''}</span>
                        <span>📍 {egitim.yer || 'ZOOM'}</span>
                        {egitim.egitmen && <span>🎤 {egitim.egitmen}</span>}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* AI Mesaj */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Hatırlatma Metni</span>
                          <button
                            onClick={() => handleMesajUret(egitim)}
                            disabled={yuklYap}
                            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amare-purple to-amare-blue text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            {yuklYap
                              ? <><Loader2 className="w-3 h-3 animate-spin" />Oluşturuluyor...</>
                              : mesaj
                                ? <><RefreshCw className="w-3 h-3" />Yenile (AI)</>
                                : <><MessageCircle className="w-3 h-3" />AI ile Oluştur</>}
                          </button>
                        </div>
                        {hata && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg mb-2">{hata}</div>
                        )}
                        <div className="relative">
                          <textarea
                            value={aktifMesaj}
                            onChange={e => setMesajlar(m => ({ ...m, [egitim.id]: e.target.value }))}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amare-purple/30 resize-none pr-28"
                          />
                          <button
                            onClick={() => handleKopyala(egitim.id, aktifMesaj)}
                            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${kopyalandi[egitim.id] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {kopyalandi[egitim.id]
                              ? <><Check className="w-3 h-3" />Kopyalandı</>
                              : <><Copy className="w-3 h-3" />Kopyala</>}
                          </button>
                        </div>
                      </div>

                      {/* Konuşmacı iletişim */}
                      {konusmacilar.some(k => k.egitmen) && (
                        <div>
                          <div className="text-sm font-semibold text-gray-700 mb-2">Konuşmacı İletişim</div>
                          <div className="space-y-2">
                            {konusmacilar.map(({ ad, egitmen: eg }, idx) => {
                              if (!eg) return null;
                              const temizTel = temizleTelefon(eg.telefon);
                              const waUrl = temizTel
                                ? `https://wa.me/${temizTel}?text=${encodeURIComponent(aktifMesaj)}`
                                : null;
                              const mailUrl = eg.email
                                ? `mailto:${eg.email}?subject=${encodeURIComponent(`Hatırlatma: ${egitim.egitim} - ${egitim.tarih}`)}&body=${encodeURIComponent(aktifMesaj)}`
                                : null;

                              return (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-800">{eg.adSoyad}</div>
                                    <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                      {eg.telefon && <span><Phone className="w-3 h-3 inline mr-0.5" />{eg.telefon}</span>}
                                      {eg.email && <span><Mail className="w-3 h-3 inline mr-0.5" />{eg.email}</span>}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {waUrl && (
                                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-600 font-semibold">
                                        <MessageCircle className="w-3 h-3" />WhatsApp
                                      </a>
                                    )}
                                    {mailUrl && (
                                      <a href={mailUrl}
                                        className="flex items-center gap-1 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 font-semibold">
                                        <Mail className="w-3 h-3" />Email
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tüm liderler */}
                      {tumTelefonlular.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-gray-700 mb-2">
                            Tüm Liderler
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              ({tumTelefonlular.length} kişi — her birine ayrı WhatsApp açılır)
                            </span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {tumTelefonlular.map((eg, idx) => {
                              const temizTel = temizleTelefon(eg.telefon);
                              const waUrl = `https://wa.me/${temizTel}?text=${encodeURIComponent(aktifMesaj)}`;
                              return (
                                <a key={idx} href={waUrl} target="_blank" rel="noopener noreferrer"
                                  title={eg.telefon}
                                  className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-lg hover:bg-green-100 font-semibold transition-colors">
                                  <MessageCircle className="w-3 h-3" />
                                  {eg.adSoyad?.split(' ')[0]}
                                </a>
                              );
                            })}
                          </div>
                          {egitmenler.filter(e => e.email && !temizleTelefon(e.telefon)).length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1.5">Sadece email:</div>
                              <div className="flex gap-2 flex-wrap">
                                {egitmenler.filter(e => e.email && !temizleTelefon(e.telefon)).map((eg, idx) => {
                                  const mailUrl = `mailto:${eg.email}?subject=${encodeURIComponent(`Hatırlatma: ${egitim.egitim} - ${egitim.tarih}`)}&body=${encodeURIComponent(aktifMesaj)}`;
                                  return (
                                    <a key={idx} href={mailUrl}
                                      className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold">
                                      <Mail className="w-3 h-3" />{eg.adSoyad?.split(' ')[0]}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
    </div>
  );
};

export default HatirlatmaModal;
