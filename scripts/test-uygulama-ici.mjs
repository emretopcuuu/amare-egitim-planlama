#!/usr/bin/env node
// scripts/test-uygulama-ici.mjs — OneTeam uygulamasının İÇİNDE açılan takvimin mağaza kuralları (26 Kas 2026).
// Ağsız, bağımlılıksız: kaynak metni okur. Çalıştır: node scripts/test-uygulama-ici.mjs
// Neden (mağaza ret denetimi K1): İngilizce cihazdaki App Store incelemecisi takvimi Türkçe gördü; komisyon sayfasında
// "Sign in with Google" (Apple 4.8 → Sign in with Apple ister; WKWebView'de açılır pencere Safari'ye gider) ve araçları
// Safari'de açan ekip yönetim paneli uygulamanın içinden erişilebilirdi. Kural BÜTÜN uygulama kullanıcıları için:
// yalnız incelemeciden gizlemek ayrı ret sebebidir (Apple 2.5.19).
import fs from 'node:fs';

const oku = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sonuc = [];
const ol = (ad, gecti) => { sonuc.push(!!gecti); console.log((gecti ? '  ✓ ' : '  ✗ ') + ad); };

const gomulu = oku('src/utils/gomulu.js');
ol('uygulamaIcindeMi: gömülü çerçeve YA DA kabuk kimliği (OTKabuk/)',
  /export function uygulamaIcindeMi\(\)/.test(gomulu) && /if \(gomuluMu\(\)\) return true;/.test(gomulu)
  && /\/OTKabuk\\\/\/\.test\(navigator\.userAgent/.test(gomulu));

const kom = oku('src/pages/KomisyonDetay.jsx');
ol('komisyon sayfası: Google girişi kutusu uygulamanın içinde çizilmez',
  /\{!duzenleyebilir && !uygulamaIcindeMi\(\) && \(/.test(kom));

const admin = oku('src/pages/AdminLogin.jsx');
ol('yönetici girişi uygulamanın içinde takvime döner',
  /if \(uygulamaIcindeMi\(\)\) return <Navigate to="\/takvim" replace \/>;/.test(admin));

const ekip = oku('src/pages/EkipYonetimSayfasi.jsx');
ol('ekip yönetim paneli (araçları Safari\'de açar) uygulamanın içinde takvime döner',
  /if \(uygulamaIcindeMi\(\)\) return <Navigate to="\/takvim" replace \/>;/.test(ekip));

const dil = oku('src/context/LanguageContext.jsx');
const bas = dil.indexOf('function getInitialLang()');
const govde = dil.slice(bas, dil.indexOf('\n}\n', bas));
ol('gömülüde uygulamanın ?lang= değeri, takvimde kayıtlı eski dilden ÖNCE okunur',
  govde.indexOf("p.get('gomulu') === '1'") > 0 && govde.indexOf("p.get('gomulu') === '1'") < govde.indexOf("localStorage.getItem('ot_lang')"));

const serit = oku('src/components/StoryStrip.jsx');
const ceviri = oku('src/i18n/translations.js');
ol('"En aktif N" çeviriden gelir, dört dilde var',
  !/>\s*En aktif \{/.test(serit) && /t\('cal_most_active'\)/.test(serit)
  && (ceviri.match(/cal_most_active: '/g) || []).length === 4);

const kirmizi = sonuc.filter((x) => !x).length;
console.log(`\n${sonuc.length - kirmizi}/${sonuc.length} geçti`);
process.exit(kirmizi ? 1 : 0);
