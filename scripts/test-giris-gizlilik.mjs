#!/usr/bin/env node
// scripts/test-giris-gizlilik.mjs — giriş email sızıntısı (O8) + yorum moderasyonu (O3), 28 Kas 2026.
// Ağsız, bağımlılıksız. Çalıştır: node scripts/test-giris-gizlilik.mjs
// Neden (O8): uye-giris-link telefon/Amare ID sorgusunda tam email'i (emailReal) döndürüyordu; ID'yi bilen
// herkes kişinin email'ini öğreniyordu. Artık yalnız maskeli email + opak jeton döner.
// Neden (O3): Apple 1.2 — kullanıcı yorumlarında bildir + engelle + süzgeç + yönetici müdahalesi şart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jetonUret, jetonHash, jetonGecerliBicim, maskEmail } from '../netlify/functions/_girisToken.mjs';
import { uygunsuzMu } from '../src/utils/yorumFiltre.js';

const kok = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (f) => fs.readFileSync(path.join(kok, f), 'utf8');
const sonuc = [];
const ol = (ad, gecti) => { sonuc.push(!!gecti); console.log((gecti ? '  ✓ ' : '  ✗ ') + ad); };

// ── O8: email istemciye dönmez ──
const taranan = [];
const gez = (d) => {
  for (const e of fs.readdirSync(path.join(kok, d), { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) gez(p);
    else if (/\.(mjs|js|jsx)$/.test(e.name)) taranan.push(p);
  }
};
gez('netlify/functions'); gez('src');
// Yorum satırlarındaki tarihçe notları sayılmaz; kodda alan/değişken olarak geçmemeli
const emailRealOlan = taranan.filter((f) => /(emailReal\s*[:=,]|\.emailReal\b|setEmailReal)/.test(oku(f)));
ol('hiçbir function/istemci dosyasında emailReal yok', emailRealOlan.length === 0);

const link = oku('netlify/functions/uye-giris-link.mjs');
const cevaplar = [...link.matchAll(/new Response\(JSON\.stringify\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
// Değer olarak ham email: "alan: uye.email," / `${uye.email}` / uye.email.slice(...)
// ("message: uye.email ? ... : ..." üçlüsü yalnız varlık kontrolü, sayılmaz)
const hamEmail = /(:\s*uye\.email\s*,|\$\{uye\.email|uye\.email\.(slice|substring))/;
ol('uye-giris-link: hiçbir cevap gövdesi uye.email içermez',
  cevaplar.length >= 5 && cevaplar.every((g) => !hamEmail.test(g)));
ol('test kendini doğrular: eski emailReal satırı yakalanırdı',
  hamEmail.test('found: true,\n emailReal: uye.email,\n') && hamEmail.test('(${uye.email.slice(0, 30)}...)'));
ol('uye-giris-link: cevap girisJetonu taşır, link jetonu yalnız continueUrl içinde',
  /girisJetonu: otpKaydedildi \? girisJetonu : null/.test(link)
  && /giris-tamamla\?uye=\$\{[^}]+\}&gt=\$\{linkJetonu\}/.test(link)
  && cevaplar.every((g) => !/linkJetonu/.test(g)));
ol('uye-giris-link: OTP dokümanına jetonların yalnız HASH\'i yazılır',
  /istemciJetonHashleri: \[jetonHash\(girisJetonu\)\]/.test(link) && /linkJetonHash: jetonHash\(linkJetonu\)/.test(link));

const dogrula = oku('netlify/functions/uye-giris-kod-dogrula.mjs');
ol('kod-dogrula: jetonla doğrular, başarı cevabında email yok',
  /array-contains', jetonHash\(girisJetonu\)/.test(dogrula)
  && /ok: true,\s*customToken,\s*\}\)/.test(dogrula));

const modal = oku('src/components/UyeGirisModal.jsx');
ol('giriş modalı email göndermez, girisJetonu gönderir',
  /JSON\.stringify\(\{ girisJetonu, kod \}\)/.test(modal) && !/amare_giris_email', data\./.test(modal));
const tamamla = oku('src/pages/GirisTamamla.jsx');
ol('giris-tamamla: ?gt= jetonunu sunucuda email\'e çevirir',
  /params\.get\('gt'\)/.test(tamamla) && /islem: 'link-email', linkJetonu/.test(tamamla));

const j = jetonUret();
ol('jeton 32 karakter, biçim doğrulaması geçer', j.length === 32 && jetonGecerliBicim(j));
ol('jeton tekrar etmez, hash 64 hex', jetonUret() !== j && /^[0-9a-f]{64}$/.test(jetonHash(j)));
ol('bozuk jeton reddedilir', !jetonGecerliBicim('x') && !jetonGecerliBicim("a'; drop") && !jetonGecerliBicim(null));
ol('maskEmail tam adresi göstermez', maskEmail('ahmet.yilmaz@gmail.com') === 'ah***@g***.com' && !maskEmail('ab@x.com').includes('ab@'));

// ── O3: yorum moderasyonu ──
ol('süzgeç: açık küfür yakalanır (TR/EN, büyük harf)', uygunsuzMu('siktir git') && uygunsuzMu('SHIT') && uygunsuzMu('İBNE'));
ol('süzgeç: masum kelimeler geçer', !uygunsuzMu('harika eğitim') && !uygunsuzMu('gotik mimari') && !uygunsuzMu('Ankara dersi') && !uygunsuzMu('sınıf'));

const yorum = oku('src/components/VideoYorumlar.jsx');
ol('yorum kartında Bildir + Engelle var, gizli/engelli yorumlar süzülür',
  /t\('yorum_bildir'\)/.test(yorum) && /t\('yorum_engelle'\)/.test(yorum)
  && /!y\.gizli && !engelSet\.has\(y\.uid\)/.test(yorum) && /uygunsuzMu\(yeniMetin\)/.test(yorum));
const bildir = oku('netlify/functions/yorum-bildir.mjs');
ol('yorum-bildir: ID token zorunlu, anonim bildiremez, yönetici işlemleri yetkili',
  /verifyIdToken/.test(bildir) && /sign_in_provider === 'anonymous'/.test(bildir) && /if \(!yoneticiMi\(decoded\)\)/.test(bildir));
const kural = oku('firestore.rules');
ol('yorum_bildirimleri istemciye kapalı', /match \/yorum_bildirimleri\/\{bildirimId\} \{\s*allow read, write: if false;/.test(kural));

const ceviri = oku('src/i18n/translations.js');
const anahtarlar = ['yorum_bildir', 'yorum_engelle', 'yorum_bildirildi', 'yorum_engelli_gizli', 'yorum_uygunsuz',
  'cal_starting_soon', 'cal_no_training_day', 'cal_deep_search'];
ol('yeni metinler dört dilde (TR/EN/DE/NL)',
  anahtarlar.every((k) => (ceviri.match(new RegExp(`\\b${k}: "`, 'g')) || []).length === 4));
const takvim = oku('src/pages/TakvimView.jsx');
ol('TakvimView: "Birazdan başlıyor / Bu günde eğitim yok / Derin Ara" sabit değil',
  !/>Birazdan başlıyor!</.test(takvim) && !/>Bu günde eğitim yok\.</.test(takvim) && !/\/>Derin Ara\s*$/m.test(takvim));

const kirmizi = sonuc.filter((x) => !x).length;
console.log(`\n${sonuc.length - kirmizi}/${sonuc.length} geçti`);
process.exit(kirmizi ? 1 : 0);
