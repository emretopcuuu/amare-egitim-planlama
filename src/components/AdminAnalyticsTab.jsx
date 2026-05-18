// Admin Panel için sistem analytics sekmesi
// DAU/MAU, top video, top sponsor, saat heatmap

import React, { useEffect, useState } from 'react';
import { Loader2, BarChart3, Users, Video, Eye, Calendar, Trophy, Tag, Clock, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { auth } from '../utils/firebase';

const AdminAnalyticsTab = () => {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  async function cek() {
    setYukleniyor(true);
    setHata('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Admin oturumu yok');
      const idToken = await user.getIdToken();
      const res = await fetch('/.netlify/functions/admin-analytics', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Yüklenemedi');
      setVeri(data);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => { cek(); }, []);

  if (yukleniyor && !veri) {
    return (
      <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-gray-500 text-sm">Sistem verileri toplanıyor...</p>
      </div>
    );
  }

  if (hata) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 text-sm font-semibold">{hata}</p>
        <button onClick={cek} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!veri) return null;
  const o = veri.ozet;

  return (
    <div className="space-y-4">
      {/* Üst bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          Sistem Karnesi
        </h2>
        <button onClick={cek} disabled={yukleniyor}
          className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-lg transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${yukleniyor ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ana KPI'lar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={<Users />} label="Toplam Marka Ortağı" value={o.toplamUye} renk="purple" />
        <Kpi icon={<Eye />} label="DAU (24sa)" value={o.dau} renk="emerald" />
        <Kpi icon={<Users />} label="WAU (7g)" value={o.wau} delta={o.wauDelta} renk="sky" />
        <Kpi icon={<Users />} label="MAU (30g)" value={o.mau} renk="amber" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Kpi icon={<Video />} label="Kayıtlı Video" value={o.toplamVideo} renk="indigo" />
        <Kpi icon={<Eye />} label="Toplam İzlenme" value={formatNum(o.toplamPlays)} renk="rose" />
        <Kpi icon={<Calendar />} label="Canlı Eğitim" value={o.toplamEgitim} renk="orange" />
      </div>

      {/* Top 10 Video + Sponsorlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            En Çok İzlenen 10 Video
          </h3>
          <div className="space-y-1.5">
            {veri.topVideo.slice(0, 10).map((v, i) => (
              <div key={v.vimeoId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs hover:bg-gray-100">
                <span className="text-amber-600 font-bold w-5 text-center">{i + 1}</span>
                <span className="text-gray-800 flex-1 truncate" title={v.baslik}>{v.baslik}</span>
                <span className="text-gray-500 inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" />{formatNum(v.plays)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            En Aktif 10 Sponsor (bu hafta)
          </h3>
          {veri.topSponsorlar?.length > 0 ? (
            <div className="space-y-1.5">
              {veri.topSponsorlar.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                  <span className="text-amber-600 font-bold w-5 text-center">{i + 1}</span>
                  <span className="text-gray-800 flex-1 truncate">{s.ad}</span>
                  <span className="text-gray-500">{s.ekipSayisi} Marka Ortağı</span>
                  <span className="text-amber-600 font-bold">{s.skor}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs text-center py-4">Bu hafta karne snapshot'ı yok</p>
          )}
        </div>
      </div>

      {/* Kategori dağılımı + Saat heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" />
            Kategori Dağılımı
          </h3>
          <div className="space-y-1.5">
            {veri.topKategoriler.map(k => {
              const yuzde = (k.sayi / o.toplamVideo) * 100;
              return (
                <div key={k.kategori}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 font-semibold">{k.kategori}</span>
                    <span className="text-gray-500">{k.sayi} ({Math.round(yuzde)}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${yuzde}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />
            Aktivite Heatmap (24 saat)
          </h3>
          <SaatHeatmap dagilim={veri.saatDagilim} />
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ icon, label, value, delta, renk }) => {
  const renkMap = {
    purple:  { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
    sky:     { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-500' },
    amber:   { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    indigo:  { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' },
    rose:    { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
    orange:  { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' },
  }[renk];
  return (
    <div className={`${renkMap.bg} border border-gray-200 rounded-xl p-3`}>
      <div className={`${renkMap.icon} mb-1 inline-flex w-4 h-4`}>
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
      </div>
      <div className={`${renkMap.text} font-extrabold text-2xl leading-none`}>{value}</div>
      <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mt-1 flex items-center justify-between">
        <span>{label}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-[10px] inline-flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
};

const SaatHeatmap = ({ dagilim }) => {
  const max = Math.max(...dagilim, 1);
  return (
    <div className="grid grid-cols-12 gap-0.5">
      {dagilim.map((v, saat) => {
        const yogunluk = v / max;
        const opacity = 0.1 + yogunluk * 0.9;
        return (
          <div key={saat} className="text-center">
            <div className="rounded text-white text-[10px] font-bold py-1.5"
              style={{ background: `rgba(124, 58, 237, ${opacity})` }}
              title={`Saat ${saat}: ${v} aktif`}>
              {v > 0 ? v : ''}
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5">{String(saat).padStart(2, '0')}</div>
          </div>
        );
      })}
    </div>
  );
};

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export default AdminAnalyticsTab;
