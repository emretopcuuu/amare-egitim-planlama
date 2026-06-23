# Afiş Üretimi Geliştirmeleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afiş üretimine rol-bazlı eğitmen etiketleri (otomatik), kısa adres + QR kod, dengeli foto düzeni ve 2 yeni şablon modu (Şablon Sadık + Maskeli AI) eklemek.

**Architecture:** Saf yardımcı fonksiyonlar (`egitmenEtiket`, `fotoYerlesim`, `qrOlustur`) yazılır ve node ile test edilir; sonra mevcut 4 generator + modal + eğitmen formu bunları kullanacak şekilde entegre edilir. Etiket çözümü üretim anında `egitmenler[].unvan`'a yazılır, böylece generator'lar değişmeden doğru etiketi alır. QR ve adres deterministik bindirilir (AI'a çizdirilmez).

**Tech Stack:** React 18 + Vite, Firebase Firestore, HTML5 Canvas, `qrcode` (yeni), Gemini (nano-banana) + OpenAI gpt-image-2.

**Test notu:** Repoda jest/vitest yok. Saf fonksiyonlar geçici node script'iyle test edilir (`node _t.mjs; rm _t.mjs` — repo köründe). Canvas/UI değişiklikleri `npm run build` + preview görsel doğrulama ile teyit edilir.

**Spec:** `docs/superpowers/specs/2026-06-23-afis-uretimi-gelistirmeleri-design.md`

---

## Phase 0 — Setup

### Task 0: qrcode bağımlılığı

**Files:**
- Modify: `package.json`

- [ ] **Step 1: qrcode kur**

Run: `npm install qrcode`
Expected: `package.json` `dependencies`'e `qrcode` eklenir, kurulum başarılı.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: qrcode bağımlılığı (afiş QR kod)"
```

---

## Phase 1 — Saf yardımcılar (TDD)

### Task 1: egitmenEtiket.js (afiş türü + etiket seçimi + kısa adres)

**Files:**
- Create: `src/utils/egitmenEtiket.js`
- Test: geçici `_t.mjs` (repo kökü)

- [ ] **Step 1: Failing test yaz** (`_t.mjs`)

```js
import { afisTuru, etiketSec, afisAdresKisa, isFiziki } from './src/utils/egitmenEtiket.js';
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok:', m); };

// afisTuru
assert(afisTuru({ kategori: 'Panel' }) === 'brans', 'kategori Panel → brans');
assert(afisTuru({ etkinlikTuru: 'Sağlıklı Yaşam ve Girişimcilik Semineri' }) === 'brans', 'Sağlıklı Yaşam → brans');
assert(afisTuru({ kategori: 'Vizyon Günü', sehir: 'İzmir', yer: 'Kongre M.' }) === 'meslek', 'Vizyon Günü → meslek');
assert(afisTuru({ sehir: 'İstanbul', yer: 'Otel' }) === 'meslek', 'fiziki (Panel değil) → meslek');
assert(afisTuru({ sehir: 'Online', yer: 'ZOOM 123' }) === 'amare', 'online → amare');

// etiketSec
const dr = { meslek: 'Avukat', amareKariyer: '3 Star Diamond', doktorBrans: 'Dahiliye Uzm.' };
assert(etiketSec(dr, 'brans') === 'Dahiliye Uzm.', 'brans alan');
assert(etiketSec(dr, 'meslek') === 'Avukat', 'meslek alan');
assert(etiketSec(dr, 'amare') === '3 Star Diamond', 'amare alan');
assert(etiketSec({ unvan: 'Eski Unvan' }, 'brans') === 'Eski Unvan', 'fallback unvan');
assert(etiketSec({ meslek: 'X' }, 'amare') === 'X', 'fallback ilk dolu');
assert(etiketSec({}, 'amare') === '', 'hepsi boş → boş');

// afisAdresKisa
assert(afisAdresKisa({ sehir: 'Online', yer: 'ZOOM 123' }) === 'ZOOM 123', 'online → yer');
assert(afisAdresKisa({ sehir: 'İzmir', mekanAdi: 'İZQ Merkezi', acikAdres: 'Akdeniz Mah. No:120, Konak/İZMİR' }) === 'İZQ Merkezi · Konak/İZMİR', 'fiziki kısa adres');
assert(afisAdresKisa({ sehir: 'İzmir', mekanAdi: 'İZQ Merkezi' }) === 'İZQ Merkezi · İzmir', 'adres yoksa şehir');

assert(isFiziki({ sehir: 'İzmir', yer: 'Otel' }) === true, 'fiziki true');
assert(isFiziki({ sehir: 'Online' }) === false, 'online false');
```

- [ ] **Step 2: Test fail görmek için çalıştır**

Run: `node _t.mjs`
Expected: FAIL (module bulunamadı).

- [ ] **Step 3: egitmenEtiket.js yaz**

```js
// Afiş türü tespiti + eğitmen etiket seçimi + kısa adres. Saf fonksiyonlar.

// Fiziki etkinlik mi? (online/Zoom değil) — mevcut sistemle aynı tanım.
export const isFiziki = (egitim) => {
  const sehir = egitim?.sehir || '';
  const yer = egitim?.yer || '';
  return sehir !== 'Online' && !yer.toLocaleUpperCase('tr-TR').includes('ZOOM');
};

// Afiş türü: 'brans' | 'meslek' | 'amare'. Panel ÖNCE kontrol edilir
// (Sağlıklı Yaşam Paneli hem fiziki hem panel olabilir).
export const afisTuru = (egitim) => {
  const kategori = egitim?.kategori || '';
  const metin = `${egitim?.etkinlikTuru || ''} ${egitim?.egitim || ''}`.toLocaleLowerCase('tr-TR');
  if (kategori === 'Panel' || /sağlıklı yaşam|panel/.test(metin)) return 'brans';
  if (kategori === 'Vizyon Günü' || isFiziki(egitim)) return 'meslek';
  return 'amare';
};

// Eğitmen için doğru etiketi seç + fallback zinciri.
export const etiketSec = (speaker, tur) => {
  if (!speaker) return '';
  const map = { brans: 'doktorBrans', meslek: 'meslek', amare: 'amareKariyer' };
  const birincil = (speaker[map[tur]] || '').trim();
  if (birincil) return birincil;
  const fallbacks = [speaker.unvan, speaker.meslek, speaker.amareKariyer, speaker.doktorBrans];
  for (const f of fallbacks) { if ((f || '').trim()) return f.trim(); }
  return '';
};

// acikAdres'ten ilçe/şehir ayıkla; olmazsa sehir.
export const ilceSehirAyikla = (egitim) => {
  const sehir = (egitim?.sehir || '').trim();
  const adres = (egitim?.acikAdres || '').trim();
  if (!adres) return sehir;
  const sonParca = adres.split(/[\n,]/).map(s => s.trim()).filter(Boolean).pop() || '';
  return sonParca || sehir;
};

// Afişte yazılacak kısa adres (fiziki) veya Zoom (online).
export const afisAdresKisa = (egitim) => {
  if (!isFiziki(egitim)) return egitim?.yer || '';
  const mekan = (egitim?.mekanAdi || '').trim();
  return [mekan, ilceSehirAyikla(egitim)].filter(Boolean).join(' · ');
};

// Modal bilgi satırı için insan-okur tür açıklaması.
export const afisTuruLabel = (tur) => ({
  brans: 'Sağlıklı Yaşam Paneli → doktor branşı',
  meslek: 'Vizyon Günü / fiziki → Amare-dışı meslek',
  amare: 'Online eğitim → Amare kariyeri',
}[tur] || '');
```

- [ ] **Step 4: Test geç görmek için çalıştır**

Run: `node _t.mjs`
Expected: tüm satırlar `ok:`.

- [ ] **Step 5: Temizle + commit**

```bash
rm _t.mjs
git add src/utils/egitmenEtiket.js
git commit -m "feat: egitmenEtiket util (afiş türü + etiket seçimi + kısa adres)"
```

### Task 2: fotoYerlesim.js (satır dağılımı)

**Files:**
- Create: `src/utils/fotoYerlesim.js`
- Test: geçici `_t.mjs`

- [ ] **Step 1: Failing test yaz** (`_t.mjs`)

```js
import { fotoYerlesim } from './src/utils/fotoYerlesim.js';
const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(ok ? 'ok:' : 'FAIL:', m, JSON.stringify(a)); if (!ok) process.exitCode = 1; };
eq(fotoYerlesim(1), [1], 'n=1');
eq(fotoYerlesim(2), [2], 'n=2');
eq(fotoYerlesim(3), [3], 'n=3');
eq(fotoYerlesim(4), [2, 2], 'n=4');
eq(fotoYerlesim(5), [3, 2], 'n=5');
eq(fotoYerlesim(6), [3, 3], 'n=6');
eq(fotoYerlesim(7), [4, 3], 'n=7');
eq(fotoYerlesim(8), [4, 4], 'n=8');
eq(fotoYerlesim(0), [], 'n=0');
```

- [ ] **Step 2: Test fail çalıştır**

Run: `node _t.mjs`
Expected: FAIL (module yok).

- [ ] **Step 3: fotoYerlesim.js yaz**

```js
// Konuşmacı fotoğraflarının satır dağılımı.
// Dönüş: satır başına kişi sayısı. Üst sıra ≥ alt sıra; alt sıra ortalı çizilir.
export const fotoYerlesim = (n) => {
  if (n <= 0) return [];
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  if (n === 5) return [3, 2];
  if (n === 6) return [3, 3];
  const ust = Math.ceil(n / 2);
  return [ust, n - ust];
};
```

- [ ] **Step 4: Test geç çalıştır**

Run: `node _t.mjs`
Expected: tüm satırlar `ok:`.

- [ ] **Step 5: Temizle + commit**

```bash
rm _t.mjs
git add src/utils/fotoYerlesim.js
git commit -m "feat: fotoYerlesim util (dengeli satır dağılımı)"
```

### Task 3: qrOlustur.js (QR dataURL)

**Files:**
- Create: `src/utils/qrOlustur.js`
- Test: geçici `_t.mjs`

- [ ] **Step 1: Failing test yaz** (`_t.mjs`)

```js
import { qrOlustur } from './src/utils/qrOlustur.js';
const url = await qrOlustur('https://egitimtakvimi.oneteamglobal.ai/e/abc123');
console.log((url && url.startsWith('data:image/')) ? 'ok: dataURL döndü' : 'FAIL: ' + url);
if (!url || !url.startsWith('data:image/')) process.exitCode = 1;
const bos = await qrOlustur('');
console.log(bos === null ? 'ok: boş url → null' : 'FAIL boş');
if (bos !== null) process.exitCode = 1;
```

- [ ] **Step 2: Test fail çalıştır**

Run: `node _t.mjs`
Expected: FAIL (module yok).

- [ ] **Step 3: qrOlustur.js yaz**

```js
import QRCode from 'qrcode';

// URL → QR PNG dataURL. Beyaz zemin + koyu mor modül (okunurluk + tema).
// Hata/boş url → null (afiş üretimi QR'sız devam eder).
export const qrOlustur = async (url, { size = 240 } = {}) => {
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#2a1244', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.warn('[qrOlustur] QR üretilemedi:', e?.message);
    return null;
  }
};
```

- [ ] **Step 4: Test geç çalıştır**

Run: `node _t.mjs`
Expected: `ok: dataURL döndü`, `ok: boş url → null`.

- [ ] **Step 5: Temizle + commit**

```bash
rm _t.mjs
git add src/utils/qrOlustur.js
git commit -m "feat: qrOlustur util (qrcode → dataURL)"
```

---

## Phase 2 — Eğitmen veri modeli

### Task 4: YeniEgitmenModal 3 etiket alanı + pre-fill

**Files:**
- Modify: `src/components/YeniEgitmenModal.jsx`

- [ ] **Step 1: Prop + state ekle**

`const YeniEgitmenModal = ({ onClose, onSaved }) => {` satırını `({ onClose, onSaved, egitmen })` yap. State bloğuna (satır 42-48) ekle:

```jsx
  const [meslek, setMeslek] = useState(egitmen?.meslek || '');
  const [amareKariyer, setAmareKariyer] = useState(egitmen?.amareKariyer || '');
  const [doktorBrans, setDoktorBrans] = useState(egitmen?.doktorBrans || '');
```

Ayrıca mevcut state başlangıçlarını pre-fill için güncelle:
`useState('')` → `useState(egitmen?.ad || '')` (ad), `useState(egitmen?.unvan || '')` (unvan), `useState(egitmen?.biyografi || '')` (biyografi), `useState(egitmen?.linkedin || '')` (linkedin), `useState(egitmen?.fotoURL || '')` (fotoBase64).

- [ ] **Step 2: Kaydetme'ye 3 alanı ekle**

`handleKaydet` içindeki `setDoc(ref, {...})` objesine (satır 101-108), `unvan` satırından sonra ekle:

```jsx
        meslek: meslek.trim() || null,
        amareKariyer: amareKariyer.trim() || null,
        doktorBrans: doktorBrans.trim() || null,
```

- [ ] **Step 3: Form UI — Unvan alanından sonra 3 alan**

Mevcut "Unvan" `<Field>` bloğunun (satır 172-177) etiketini "Genel unvan (yedek)" yap ve hemen sonrasına ekle:

```jsx
          {/* Rol-bazlı etiketler (afiş türüne göre otomatik seçilir) */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
            <p className="text-[11px] text-purple-700 font-semibold">
              Afiş türüne göre otomatik yazılır: Vizyon Günü → meslek, Sağlıklı Yaşam Paneli → branş, online eğitim → Amare kariyeri.
            </p>
            <Field label="Amare-dışı meslek">
              <input type="text" value={meslek} onChange={e => setMeslek(e.target.value)}
                placeholder="Örn: Kd.Albay (E), Avukat"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
            <Field label="Amare kariyeri">
              <input type="text" value={amareKariyer} onChange={e => setAmareKariyer(e.target.value)}
                placeholder="Örn: 3 Star Diamond"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
            <Field label="Doktor branşı">
              <input type="text" value={doktorBrans} onChange={e => setDoktorBrans(e.target.value)}
                placeholder="Örn: Dahiliye ve Fonksiyonel Tıp Uzm."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" />
            </Field>
          </div>
```

Başlık metnini de güncelle: header `<h3>` "Yeni Eğitmen Ekle" → `{egitmen ? 'Eğitmen Düzenle' : 'Yeni Eğitmen Ekle'}`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: temiz build (hatasız).

- [ ] **Step 5: Commit**

```bash
git add src/components/YeniEgitmenModal.jsx
git commit -m "feat: eğitmen formuna 3 rol etiketi (meslek/amare/branş) + düzenle pre-fill"
```

### Task 5: DataContext light fields

**Files:**
- Modify: `src/context/DataContext.jsx` (`KONUSMACI_LIGHT_FIELDS`)

- [ ] **Step 1: Alanları ekle**

`KONUSMACI_LIGHT_FIELDS` dizisini bul (Explore: ~satır 198). `['ad','unvan','biyografi','linkedin']` → ekle:

```js
const KONUSMACI_LIGHT_FIELDS = ['ad','unvan','biyografi','linkedin','meslek','amareKariyer','doktorBrans'];
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/context/DataContext.jsx
git commit -m "feat: konuşmacı light alanlarına meslek/amare/branş"
```

---

## Phase 3 — #1 Etiket entegrasyonu

### Task 6: AdminPanel — üretim anında etiket çöz

**Files:**
- Modify: `src/pages/AdminPanel.jsx` (egitmenler[] kurulduğu yer, Explore: ~527-545)

- [ ] **Step 1: Import ekle**

AdminPanel.jsx import bloğuna:

```js
import { afisTuru, etiketSec } from '../utils/egitmenEtiket';
```

- [ ] **Step 2: Etiket çözümünü uygula**

`egitmenFotosuBul` ile `egitmenler` dizisinin kurulduğu blokta (görsel modal açılırken), her konuşmacının `unvan`'ını çözülmüş etikete ayarla. Mevcut map'i bul; her eleman için:

```js
const tur = afisTuru(secilenEgitim); // modal açılan eğitim objesi
const egitmenlerCozulmus = egitmenlerHam.map(e => ({
  ...e,
  unvan: etiketSec(e, tur), // ham alanlar (meslek/amareKariyer/doktorBrans) → doğru etiket
}));
```

`egitmenlerCozulmus` modal'a `egitmenler` prop'u olarak geçilir. (Değişken adlarını mevcut koda uyarlayın — temel kural: modal'a giden diziye `unvan = etiketSec(speaker, afisTuru(egitim))` yazılır.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: temiz.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPanel.jsx
git commit -m "feat: görsel üretiminde eğitmen etiketini afiş türüne göre çöz"
```

### Task 7: Modal — tespit edilen tür bilgi satırı

**Files:**
- Modify: `src/components/GorselOlusturModal.jsx`

- [ ] **Step 1: Import + bilgi satırı**

Import: `import { afisTuru, afisTuruLabel } from '../utils/egitmenEtiket';`

Etiket kutusu (`ekPrompt` textarea) başlığının yanına, küçük bilgi satırı ekle (modal `egitim` prop'unu alıyor):

```jsx
<p className="text-[11px] text-purple-600 mb-1">
  Tespit edilen tür: {afisTuruLabel(afisTuru(egitim))}
</p>
```

> Not: `ekPrompt` autofill'i (satır 34-51) DEĞİŞMEZ — `egitmenler[].unvan` zaten Task 6'da çözülmüş etiketi taşıyor.

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/GorselOlusturModal.jsx
git commit -m "feat: görsel modalına tespit edilen afiş türü bilgisi"
```

---

## Phase 4 — #2 Kısa adres + QR

### Task 8: gorselLogoEkle — QR overlay (Gemini/OpenAI/B için)

**Files:**
- Modify: `src/utils/gorselLogoEkle.js`

- [ ] **Step 1: İmza + QR çizimi**

`logolariEkle(aiCikti)` imzasını `logolariEkle(aiCikti, { qrDataUrl } = {})` yap. Logolar çizildikten sonra (satır 73'ten sonra, `// 5. Yeni base64` öncesi) ekle:

```js
    // QR kod (varsa) — sağ alt köşe, gerçek (AI değil), logoların üstünde
    if (qrDataUrl) {
      try {
        const qrImg = await urlToImage(qrDataUrl);
        const qrSize = Math.max(90, Math.floor(W * 0.11));
        const pad = Math.floor(W * 0.03);
        const qrX = W - qrSize - pad;
        const qrY = H - qrSize - pad;
        // Beyaz zemin (okunurluk) + QR
        ctx.save();
        ctx.fillStyle = '#ffffff';
        const b = Math.floor(qrSize * 0.06);
        ctx.fillRect(qrX - b, qrY - b, qrSize + 2 * b, qrSize + 2 * b);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        // Etiket
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(qrSize * 0.12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText('Yol tarifi için okut', qrX + qrSize / 2, qrY - b - 6);
        ctx.restore();
      } catch (e) {
        console.warn('[logo-ekle] QR eklenemedi:', e.message);
      }
    }
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/utils/gorselLogoEkle.js
git commit -m "feat: logolariEkle opsiyonel QR overlay (sağ alt köşe)"
```

### Task 9: Gemini + OpenAI generator — kısa adres + QR

**Files:**
- Modify: `src/utils/gorselOlustur.js` (Gemini)
- Modify: `src/utils/gorselOlusturOpenAIPro.js` (OpenAI)

- [ ] **Step 1: Import + adres**

Her iki dosyada: `import { afisAdresKisa, isFiziki } from './egitmenEtiket';` ve `import { qrOlustur } from './qrOlustur';` ekle. Prompt'taki `egitim.yer` adres kullanımını `afisAdresKisa(egitim)` ile değiştir (Explore: gorselOlustur.js:203, OpenAIPro.js:171). Fiziki etkinlikte prompt'a şu talimatı ekle: "Sağ alt köşede QR kod için ~%12 kare boşluk bırak; oraya hiçbir şey yazma."

- [ ] **Step 2: QR overlay**

`logolariEkle(aiCikti)` çağrısını (gorselOlustur.js:349, OpenAIPro.js:257) şununla değiştir:

```js
const qrDataUrl = isFiziki(egitim)
  ? await qrOlustur(`${typeof window !== 'undefined' ? window.location.origin : ''}/e/${egitim.id || ''}`)
  : null;
const sonuc = await logolariEkle(aiCikti, { qrDataUrl });
```

(`aiCikti`/`sonuc` değişken adlarını mevcut koda uyarlayın.)

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/utils/gorselOlustur.js src/utils/gorselOlusturOpenAIPro.js
git commit -m "feat: Gemini+OpenAI afişte kısa adres + QR overlay (fiziki)"
```

### Task 10: Canvas + Hibrit — kısa adres çoklu satır + QR çizimi

**Files:**
- Modify: `src/utils/gorselOlusturCanvas.js`
- Modify: `src/utils/gorselOlusturHibrit.js`

- [ ] **Step 1: Import**

Her iki dosyada: `import { afisAdresKisa, isFiziki } from './egitmenEtiket';` ve `import { qrOlustur } from './qrOlustur';`.

- [ ] **Step 2: Adres — kırpma yerine kısa adres**

Canvas (satır 342-343) `egitim.yer.length > 50 ? slice...` bloğunu değiştir:

```js
const adresMetni = afisAdresKisa(egitim);
if (adresMetni) {
  drawWrappedText(ctx, adresMetni, W / 2, H - 165, W * 0.8, 32, 2);
}
```

Hibrit'te (satır 424-431) aynı mantık (oradaki Y/maxWidth değerlerini koru, `drawWrappedText` ile çok satır).

- [ ] **Step 3: QR çizimi (fiziki)**

Her iki dosyada, logo çiziminden hemen sonra (Canvas ~satır 383 civarı, logolar bitince) ekle:

```js
if (isFiziki(egitim)) {
  const qrDataUrl = await qrOlustur(`${window.location.origin}/e/${egitim.id || ''}`);
  if (qrDataUrl) {
    try {
      const qrImg = await urlToImage(qrDataUrl);
      const qrSize = Math.floor(W * 0.12);
      const pad = Math.floor(W * 0.03);
      const qrX = W - qrSize - pad, qrY = H - qrSize - pad;
      const b = Math.floor(qrSize * 0.06);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - b, qrY - b, qrSize + 2 * b, qrSize + 2 * b);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(qrSize * 0.12)}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.fillText('Yol tarifi için okut', qrX + qrSize / 2, qrY - b - 6);
      ctx.shadowBlur = 0;
    } catch (e) { console.warn('[canvas] QR eklenemedi:', e.message); }
  }
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/utils/gorselOlusturCanvas.js src/utils/gorselOlusturHibrit.js
git commit -m "feat: Canvas+Hibrit kısa adres çok-satır + QR çizimi (fiziki)"
```

---

## Phase 5 — #3 Foto düzeni

### Task 11: Canvas + Hibrit — fotoYerlesim ile dengeli satırlar, foto küçültme yok

**Files:**
- Modify: `src/utils/gorselOlusturCanvas.js` (satır 206-334 grid bloğu)
- Modify: `src/utils/gorselOlusturHibrit.js` (satır 286-412 grid bloğu)

- [ ] **Step 1: Import**

`import { fotoYerlesim } from './fotoYerlesim';` (her iki dosya).

- [ ] **Step 2: Grid'i satır-bazlı yap (Canvas)**

`const cols = Math.min(...); const rows = Math.ceil(...)` ve tek `for` döngüsünü, satır dağılımına göre yeniden yaz. Mevcut foto/isim/unvan çizim mantığı (placeholderCiz, urlToImage, drawWrappedText) AYNEN korunur; sadece kaç sütun ve x/y hesabı değişir:

```js
const dagilim = fotoYerlesim(fotoluListe.length); // örn [3,2]
const rows = dagilim.length;
const maxCols = Math.max(...dagilim);
const gap = 25, rowGap = 30, textAreaH = 150;
const availableHPerRow = (cardsAreaH - rowGap * (rows - 1)) / rows;
const maxFotoFromH = availableHPerRow - textAreaH;
const maxCardW = (W - 80 - gap * (maxCols - 1)) / maxCols;
// Foto küçültme yok: cömert taban (≥200), üst sınır maxCardW/maxFotoFromH
const fotoSize = Math.max(200, Math.min(maxCardW * 0.95, maxFotoFromH, 300));
const cardW = Math.max(fotoSize, maxCardW);
const cardH = fotoSize + textAreaH;
const rowH = cardH + rowGap;

let idx = 0;
for (let r = 0; r < rows; r++) {
  const satirAdet = dagilim[r];
  const totalW = cardW * satirAdet + gap * (satirAdet - 1);
  const startX = (W - totalW) / 2; // her satır kendi içinde ORTALI
  const y = cardsStartY + r * rowH;
  for (let c = 0; c < satirAdet; c++, idx++) {
    const e = fotoluListe[idx];
    const x = startX + c * (cardW + gap);
    // ... mevcut foto+isim+unvan çizim kodu (fotoX, fotoY, placeholderCiz, drawWrappedText) AYNEN ...
  }
}
```

Eski `for (let i...)` döngüsündeki `col/row/x/y` hesapları yeni iç döngüyle değişir; gövdedeki çizim satırları korunur. Hibrit'te aynı dönüşüm (oradaki fotoSize taban değerini de ≥200 yap).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: temiz.

- [ ] **Step 4: Commit**

```bash
git add src/utils/gorselOlusturCanvas.js src/utils/gorselOlusturHibrit.js
git commit -m "feat: dengeli foto düzeni (3+3/3+2 ortalı), foto küçültme yok"
```

### Task 12: OpenAI pre-composite — aynı dağılım

**Files:**
- Modify: `src/utils/gorselOlusturOpenAIPro.js` (pre-composite, satır 47-108)

- [ ] **Step 1: fotoYerlesim uygula**

`import { fotoYerlesim } from './fotoYerlesim';`. Pre-composite foto yerleşim döngüsünü Task 11'deki satır-bazlı mantıkla değiştir (aynı `dagilim`/`startX` ortalama; foto boyutu taban koru).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/utils/gorselOlusturOpenAIPro.js
git commit -m "feat: OpenAI pre-composite dengeli foto düzeni"
```

---

## Phase 6 — #4 İki yeni mod

### Task 13: Şablon Sadık (A) generator

**Files:**
- Create: `src/utils/gorselOlusturSablonSadik.js`

- [ ] **Step 1: Generator yaz**

`gorselOlusturCanvas.js`'i temel al, AMA: (a) üst/alt karartma maskesini ÇIKAR (şablon %100 görünür kalsın), (b) her metin bloğunun (başlık, tarih, adres) arkasına lokal yarı saydam yuvarlak scrim çiz (okunurluk), (c) foto düzeni `fotoYerlesim`, adres `afisAdresKisa`, QR (fiziki) — Task 10/11 ile aynı. İmza:

```js
export const gorselOlusturSablonSadik = async ({ egitim, egitmenler = [], sablonFile, ekPrompt = '', width = 1080, height = 1080 }) => { /* canvas, şablon 100% + lokal scrim + içerik + QR */ };
```

Lokal scrim helper (her metin bloğu öncesi):

```js
const scrimCiz = (cx, cy, w, h) => {
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,40,0.45)';
  const r = 18;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  ctx.fill();
  ctx.restore();
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: temiz.

- [ ] **Step 3: Commit**

```bash
git add src/utils/gorselOlusturSablonSadik.js
git commit -m "feat: Şablon Sadık (A) modu — şablon korunur, lokal scrim + içerik"
```

### Task 14: Maskeli AI (B) generator

**Files:**
- Create: `src/utils/gorselOlusturMaskeliAI.js`

- [ ] **Step 1: Generator yaz**

`gorselOlusturOpenAIPro.js`'i temel al. Farklar: (a) taban = şablon + gerçek foto pre-composite (mevcut yaklaşım yeniden kullanılır), (b) bir maske PNG üret: içerik bölgeleri (üst başlık bandı, alt bilgi/adres bandı) şeffaf, geri kalan opak; OpenAI `images/edits`'e `image` (pre-composite) + `mask` gönder, (c) prompt: "yalnız maskeli alanları şablon paletinde yazı/dekorla doldur, maske dışına dokunma", (d) `logolariEkle(out, { qrDataUrl })` (fiziki QR).

Maske üretimi (canvas):

```js
const maskeUret = (W, H) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const m = c.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);       // opak = korun
  m.clearRect(0, Math.floor(H * 0.04), W, Math.floor(H * 0.20)); // üst başlık bandı (şeffaf = düzenle)
  m.clearRect(0, Math.floor(H * 0.74), W, Math.floor(H * 0.20)); // alt bilgi bandı
  return c.toDataURL('image/png');
};
```

İmza `gorselOlusturOpenAIPro` ile aynı (`{ apiKey, egitim, egitmenler, sablonFile, ekPrompt, quality, format }`).

> Risk: model çıktısı değişken; başarısızsa fallback Şablon Sadık (A).

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/utils/gorselOlusturMaskeliAI.js
git commit -m "feat: Maskeli AI (B) modu — şablon maskeli AI edit + QR"
```

### Task 15: Modal — 2 yeni mod butonu + dispatch + fallback

**Files:**
- Modify: `src/components/GorselOlusturModal.jsx` (üretim yöntemi satırı ~365-414 + üretim dispatcher)

- [ ] **Step 1: Import**

```js
import { gorselOlusturSablonSadik } from '../utils/gorselOlusturSablonSadik';
import { gorselOlusturMaskeliAI } from '../utils/gorselOlusturMaskeliAI';
```

- [ ] **Step 2: Mod listesine 2 buton ekle**

Üretim yöntemi seçenekleri dizisine (Hibrit/Gemini/Canvas/OpenAI Pro'nun tanımlandığı yer) ekle:

```js
{ id: 'sablon-sadik', ad: 'Şablon Sadık', not: 'Şablon birebir + içerik', maliyet: 'ÜCRETSİZ' },
{ id: 'maskeli-ai', ad: 'Şablon + AI', not: 'Maskeli AI · ~$0.08', maliyet: '~$0.08' },
```

- [ ] **Step 3: Dispatcher'a ekle**

Üretim fonksiyonunda (model seçimine göre generator çağıran switch/if), ekle:

```js
} else if (model === 'sablon-sadik') {
  sonuc = await gorselOlusturSablonSadik({ egitim, egitmenler, sablonFile, ekPrompt, width, height });
} else if (model === 'maskeli-ai') {
  sonuc = await gorselOlusturMaskeliAI({ apiKey: openaiApiKey, egitim, egitmenler, sablonFile, ekPrompt, format });
}
```

Fallback zincirine (fallback açıksa) Şablon Sadık'ı son güvenli liman olarak ekle: maskeli-ai başarısız → sablon-sadik.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add src/components/GorselOlusturModal.jsx
git commit -m "feat: görsel modalına Şablon Sadık + Maskeli AI modları + fallback"
```

---

## Phase 7 — Doğrulama + deploy

### Task 16: Preview görsel doğrulama

- [ ] **Step 1: Preview başlat**

`preview_start` (amare-dev). Admin'e gir (mümkünse) veya generator'ları test eden bir geçici sayfa/▶ ile bir fiziki + bir online + 5 ve 6 kişilik afiş üret.

- [ ] **Step 2: Kontroller**
- Fiziki afişte: kısa adres (mekan · ilçe/şehir) + sağ altta QR. Online'da QR yok.
- QR'ı telefonla okut → `/e/:id` açılmalı.
- 6 kişi → 3+3, 5 kişi → 3+2 ortalı; fotolar küçülmemiş.
- Eğitmen etiketi: Vizyon Günü afişinde meslek, Panel'de branş, online'da Amare kariyeri.
- Şablon Sadık: şablon birebir, üstte içerik. Maskeli AI: şablon korunmuş.

- [ ] **Step 3: Console hata kontrolü**

`preview_console_logs` (error) → temiz olmalı.

### Task 17: Deploy

- [ ] **Step 1: Onay al**

Kullanıcıdan canlı deploy onayı (production = Netlify push).

- [ ] **Step 2: Push**

```bash
git pull --rebase origin main
git push origin main
```

Netlify otomatik deploy eder.

---

## Self-review notları
- Spec'teki 4 madde + QR revizyonu Task 1-15 ile karşılanıyor.
- Tip tutarlılığı: `afisTuru→'brans'|'meslek'|'amare'`, `etiketSec(speaker,tur)`, `afisAdresKisa(egitim)`, `fotoYerlesim(n)→number[]`, `qrOlustur(url)→Promise<string|null>`, `logolariEkle(aiCikti,{qrDataUrl})` — tüm task'larda aynı.
- Geriye dönük uyum: yeni eğitmen alanları opsiyonel + `unvan` fallback; online davranışı değişmez; mevcut 4 mod korunur.
