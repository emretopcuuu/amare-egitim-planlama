# 🌟 AMARE EĞİTİM PLANLAMA SİSTEMİ

Mayıs 2026 için profesyonel eğitim takvimi oluşturma ve yönetme sistemi.

## ✨ Özellikler

### Eğitmen Başvuru Sistemi
- Diamond ve üzeri liderler için başvuru formu
- Verebilecekleri eğitimleri seçme
- Uygun gün ve saat belirtme
- Otomatik form validasyonu

### Otomatik Takvim Oluşturma
- Akıllı algoritma ile optimize edilmiş takvim
- Haftalık kategori dağılımı (Motivasyon, Aksiyon, Liderlik, Büyüme)
- Her eğitmen ayda 1 eğitim kuralı
- Deneyimli eğitmenlere öncelik
- Çakışma kontrolü

### Takvim Görüntüleme
- Haftalık breakdown ile düzenli görünüm
- PDF export özelliği
- Mobil uyumlu tasarım
- Yayınla/Gizle kontrolü

### Admin Paneli
- Tüm başvuruları görüntüleme
- Otomatik takvim oluşturma
- Manuel düzenleme ve silme
- İstatistikler ve raporlar

## 🚀 Kurulum Adımları

### 1. Gereksinimler

- Node.js 18+ kurulu olmalı
- Firebase hesabı (ücretsiz)
- Netlify hesabı (ücretsiz)

### 2. Firebase Kurulumu

#### A) Firebase Projesi Oluştur

1. https://console.firebase.google.com adresine git
2. "Add project" (Proje Ekle) butonuna tıkla
3. Proje adı: `amare-egitim-planlama`
4. Google Analytics'i devre dışı bırakabilirsin (opsiyonel)

#### B) Firestore Database Oluştur

1. Sol menüden "Firestore Database" seç
2. "Create database" butonuna tıkla
3. "Start in production mode" seç
4. Location: `eur3 (europe-west)` seç

#### C) Güvenlik Kuralları

Firestore Database → Rules sekmesine git ve şunu yapıştır:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Eğitmenler - Herkes okuyabilir ve yazabilir
    match /egitmenler/{document} {
      allow read, write: true;
    }
    
    // Takvim - Herkes okuyabilir, sadece admin yazabilir
    match /takvim/{document} {
      allow read: true;
      allow write: true; // Production'da bu kısıtlanabilir
    }
    
    // Settings - Herkes okuyabilir
    match /settings/{document} {
      allow read: true;
      allow write: true; // Production'da bu kısıtlanabilir
    }
  }
}
```

"Publish" butonuna tıkla.

#### D) Firebase Config Bilgilerini Al

1. Sol menüden "Project Settings" (⚙️ icon)
2. "Your apps" bölümünde "Add app" → Web (</>)
3. App nickname: `amare-web`
4. Firebase Hosting'i şimdilik kur

ma
5. "Register app" butonuna tıkla
6. firebaseConfig objesini kopyala

### 3. Proje Kurulumu

```bash
# Projeyi klonla veya indir
cd amare-egitim-planlama

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle ve Firebase bilgilerini gir
nano .env
```

### 4. Firebase Config Dosyasını Güncelle

`src/utils/firebase.js` dosyasını aç ve Firebase config bilgilerini yapıştır:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "amare-egitim-planlama.firebaseapp.com",
  projectId: "amare-egitim-planlama",
  storageBucket: "amare-egitim-planlama.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 5. Lokal Test

```bash
# Development server başlat
npm run dev

# Browser'da aç:
# http://localhost:5173
```

### 6. Netlify'a Deploy

#### A) GitHub'a Yükle (Önerilen)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/amare-egitim.git
git push -u origin main
```

#### B) Netlify'da Deploy

1. https://app.netlify.com adresine git
2. "Add new site" → "Import an existing project"
3. GitHub'ı bağla ve repo seç
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. "Deploy site" butonuna tıkla

#### C) Environment Variables Ekle

Netlify Dashboard'da:
1. Site settings → Environment variables
2. Firebase config bilgilerini ekle (opsiyonel, zaten kodda var)

### 7. Domain Bağlama (Opsiyonel)

Netlify Dashboard → Domain settings → Add custom domain

## 🔑 Admin Girişi

**Şifre:** `oneteam10x`

Admin paneline erişmek için:
1. Ana sayfada "Admin Paneli" kartına tıkla
2. Şifreyi gir: `oneteam10x`

Şifreyi değiştirmek için:
- `src/context/DataContext.jsx` dosyasında `adminGiris` fonksiyonunu düzenle

## 📱 Kullanım

### Eğitmen Başvurusu

1. Ana sayfada "Eğitmen Başvurusu" kartına tıkla
2. Formu eksiksiz doldur
3. "Başvuruyu Gönder" butonuna tıkla
4. Başvuru otomatik kaydedilir

### Takvim Görüntüleme

1. Ana sayfada "Eğitim Takvimi" kartına tıkla
2. Haftalık breakdown'ı gör
3. PDF indirmek için "PDF İndir" butonuna tıkla

### Admin Paneli

1. "Başvurular" sekmesinde tüm başvuruları gör
2. "Takvim" sekmesinde:
   - "Otomatik Oluştur" ile akıllı takvim oluştur
   - Eğitimleri manuel sil/düzenle
3. "Ayarlar" sekmesinde:
   - Takvimi yayınla/gizle
   - İstatistikleri gör

## 🎨 Teknik Detaylar

### Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Hosting:** Netlify
- **Icons:** Lucide React
- **PDF Export:** jsPDF + jsPDF-AutoTable

### Proje Yapısı

```
amare-egitim-planlama/
├── src/
│   ├── components/        # Reusable components
│   ├── context/          # React Context (State)
│   ├── pages/            # Sayfa component'leri
│   ├── utils/            # Utility fonksiyonları
│   ├── App.jsx           # Ana app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── netlify/
│   └── functions/        # Serverless functions (opsiyonel)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔧 Troubleshooting

### Firebase bağlantı hatası

- Firebase config bilgilerini kontrol et
- Firestore Database'in oluşturulduğundan emin ol
- Security Rules'un publish edildiğini kontrol et

### Deploy sonrası beyaz ekran

- Browser console'da hata kontrol et
- Netlify build logs'u incele
- Environment variables'ları kontrol et

### Admin paneline giremiyorum

- Şifrenin doğru olduğunu kontrol et: `oneteam10x`
- Browser'ı yenile ve tekrar dene
- localStorage'ı temizle

## 📧 Destek

Sorun yaşarsan:
1. Firebase Console'da Firestore'u kontrol et
2. Netlify deploy logs'unu incele
3. Browser console'da hataları kontrol et

## 🎯 Gelecek Özellikler (Opsiyonel)

- [ ] Email bildirimleri (Netlify Functions + Resend)
- [ ] WhatsApp entegrasyonu
- [ ] Zoom link otomatik paylaşımı
- [ ] Katılımcı kayıt sistemi
- [ ] Eğitim geri bildirimi

---

**© 2026 Amare Global | Powered by OneTeam10x**
