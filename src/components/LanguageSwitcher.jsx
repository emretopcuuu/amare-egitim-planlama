// Dil seçici — TEK bayrak + tıklayınca açılan menü (2026-07-12).
// Eskiden 4 dil yan yana buton olarak duruyordu; Windows'ta bayrak emojileri
// bayrak yerine harf çizildiği için "TR TR", "GB EN" gibi tekrarlar oluşuyordu.
// Çözüm: emoji YOK → inline SVG bayrak (her platformda aynı) + tek tetikleyici.
// Menü PORTAL ile body'ye çizilir — sayfalardaki overflow-hidden/x-hidden
// sarmalayıcılar menüyü kırpamaz (EventActions ile aynı desen).
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

// ── SVG bayraklar (20×15) — emoji bağımlılığı yok ──
const Bayrak = ({ kod, className = 'w-5 h-[15px]' }) => {
  const ortak = { viewBox: '0 0 20 15', className: `${className} rounded-[2px] shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]`, 'aria-hidden': true };
  if (kod === 'tr') return (
    <svg {...ortak}>
      <rect width="20" height="15" fill="#E30A17" />
      <circle cx="7.6" cy="7.5" r="3.5" fill="#fff" />
      <circle cx="8.8" cy="7.5" r="2.8" fill="#E30A17" />
      <polygon fill="#fff" points="12.6,5.5 13.05,6.89 14.5,6.88 13.32,7.74 13.78,9.12 12.6,8.26 11.42,9.12 11.88,7.74 10.7,6.88 12.15,6.89" />
    </svg>
  );
  if (kod === 'en') return (
    <svg {...ortak}>
      <rect width="20" height="15" fill="#012169" />
      <path d="M0 0l20 15M20 0L0 15" stroke="#fff" strokeWidth="3" />
      <path d="M0 0l20 15M20 0L0 15" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M10 0v15M0 7.5h20" stroke="#fff" strokeWidth="5" />
      <path d="M10 0v15M0 7.5h20" stroke="#C8102E" strokeWidth="3" />
    </svg>
  );
  if (kod === 'de') return (
    <svg {...ortak}>
      <rect width="20" height="5" fill="#000" />
      <rect y="5" width="20" height="5" fill="#DD0000" />
      <rect y="10" width="20" height="5" fill="#FFCE00" />
    </svg>
  );
  return ( // nl
    <svg {...ortak}>
      <rect width="20" height="5" fill="#AE1C28" />
      <rect y="5" width="20" height="5" fill="#fff" />
      <rect y="10" width="20" height="5" fill="#21468B" />
    </svg>
  );
};

// Diller kendi dilinde yazılır (kullanıcı kendi dilini tanır)
const AD = { tr: 'Türkçe', en: 'English', de: 'Deutsch', nl: 'Nederlands' };

// Açılış eğrisi: yerleşik ease'ler zayıf kalıyor; giriş için güçlü ease-out.
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const LanguageSwitcher = ({ className = '' }) => {
  const { lang, setLang, SUPPORTED_LANGS } = useTranslation();
  const [acik, setAcik] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const tetikRef = useRef(null);
  const menuRef = useRef(null);

  const MENU_G = 176; // w-44

  // Menüyü tetikleyiciye göre konumlandır (sağa hizalı, ekrandan taşmaz)
  useLayoutEffect(() => {
    if (!acik || !tetikRef.current) return;
    const r = tetikRef.current.getBoundingClientRect();
    const kenar = 8;
    let left = r.right - MENU_G;
    if (left < kenar) left = kenar;
    if (left + MENU_G > window.innerWidth - kenar) left = window.innerWidth - MENU_G - kenar;
    let top = r.bottom + 6;
    const menuY = 4 + SUPPORTED_LANGS.length * 40;
    if (top + menuY > window.innerHeight - kenar) top = Math.max(kenar, r.top - menuY - 6);
    setPos({ top, left });
  }, [acik, SUPPORTED_LANGS.length]);

  // Dış tıklama / ESC / scroll → kapat
  useEffect(() => {
    if (!acik) return;
    const disari = (e) => {
      if (tetikRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setAcik(false);
    };
    const esc = (e) => { if (e.key === 'Escape') { setAcik(false); tetikRef.current?.focus(); } };
    const kapat = () => setAcik(false);
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', kapat, { passive: true });
    window.addEventListener('resize', kapat, { passive: true });
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', kapat);
      window.removeEventListener('resize', kapat);
    };
  }, [acik]);

  const sec = (l) => { setLang(l); setAcik(false); tetikRef.current?.focus(); };

  return (
    <>
      <button
        ref={tetikRef}
        onClick={() => setAcik(a => !a)}
        aria-haspopup="listbox"
        aria-expanded={acik}
        aria-label={`Dil: ${AD[lang]}`}
        title={AD[lang]}
        className={`inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 rounded-full pl-1.5 pr-2 py-1 transition-[background-color,transform] duration-150 active:scale-[0.97] motion-reduce:transition-none ${className}`}
      >
        <Bayrak kod={lang} />
        <span className="text-[11px] font-bold uppercase text-white tracking-wide">{lang}</span>
        <ChevronDown className={`w-3 h-3 text-white/60 transition-transform duration-200 motion-reduce:transition-none ${acik ? 'rotate-180' : ''}`} style={{ transitionTimingFunction: EASE }} />
      </button>

      {acik && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Dil seçimi"
          style={{ top: pos.top, left: pos.left, width: MENU_G, transformOrigin: 'top right' }}
          className="fixed z-[100] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-1 animate-dropIn"
        >
          {SUPPORTED_LANGS.map((l) => {
            const aktif = l === lang;
            return (
              <button
                key={l}
                role="option"
                aria-selected={aktif}
                onClick={() => sec(l)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors duration-150 motion-reduce:transition-none
                  ${aktif ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
              >
                <Bayrak kod={l} />
                <span className={`flex-1 text-sm ${aktif ? 'font-bold text-amare-purple' : 'font-medium text-gray-700'}`}>{AD[l]}</span>
                {aktif && <Check className="w-4 h-4 text-amare-purple shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default LanguageSwitcher;
