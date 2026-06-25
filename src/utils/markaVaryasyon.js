// Marka Afiş varyasyon seçenekleri — her çip deterministik bir komuta bağlı.
// tekil:true → grup içinde tek seçim (radyo); değilse çoklu seçim (toggle).
// Hem Görsel Stüdyo sayfası hem (eski) modal bu listeyi kullanır.
export const MARKA_VARYASYON = [
  { grup: 'Yazı', tekil: true, secenekler: [
    { key: 'yazi-buyuk', label: 'Büyük', cmd: 'yazıları büyüt' },
    { key: 'yazi-kucuk', label: 'Küçük', cmd: 'yazıları küçült' },
    { key: 'yazi-cokkucuk', label: 'Çok küçük', cmd: 'yazıları çok küçült' },
  ] },
  { grup: 'Fotoğraf', tekil: true, secenekler: [
    { key: 'foto-buyuk', label: 'Büyük', cmd: 'fotoları büyüt' },
    { key: 'foto-kucuk', label: 'Küçük', cmd: 'fotoları küçült' },
    { key: 'foto-teksira', label: 'Tek sıra', cmd: 'tek sıra' },
  ] },
  { grup: 'Tema', tekil: true, secenekler: [
    { key: 'tema-siyah', label: 'Siyah & altın', cmd: 'siyah tema', renk: '#0b0b0d' },
    { key: 'tema-mor', label: 'Mor', cmd: 'mor tema', renk: '#3a2b54' },
    { key: 'tema-lacivert', label: 'Lacivert', cmd: 'lacivert tema', renk: '#0c1730' },
    { key: 'tema-bordo', label: 'Bordo', cmd: 'bordo tema', renk: '#2c0e13' },
    { key: 'tema-zumrut', label: 'Zümrüt', cmd: 'zümrüt tema', renk: '#0a261d' },
    { key: 'tema-krem', label: 'Krem & altın', cmd: 'krem tema', renk: '#ece0c8' },
    { key: 'tema-gumus', label: 'Gümüş', cmd: 'gümüş tema', renk: '#1a1c20' },
    { key: 'tema-platin', label: 'Platin', cmd: 'platin tema', renk: '#e2e4e8' },
  ] },
  { grup: 'Yazı tipi', tekil: true, secenekler: [
    { key: 'font-klasik', label: 'Klasik', cmd: 'klasik font' },
    { key: 'font-zarif', label: 'Zarif (serif)', cmd: 'zarif font' },
    { key: 'font-karisik', label: 'Şık isimler', cmd: 'şık isim' },
    { key: 'font-modern', label: 'Modern', cmd: 'modern font' },
    { key: 'font-times', label: 'Klasik serif', cmd: 'klasik serif' },
  ] },
  { grup: 'Başlık', tekil: false, secenekler: [
    { key: 'baslik-cift', label: 'İki renkli', cmd: 'iki renkli başlık' },
  ] },
  { grup: 'Foto şekli', tekil: true, secenekler: [
    { key: 'sekil-yuvarlak', label: 'Yuvarlak', cmd: 'yuvarlak foto' },
    { key: 'sekil-kare', label: 'Yuvarlak kare', cmd: 'kare foto' },
    { key: 'sekil-altigen', label: 'Altıgen', cmd: 'altıgen' },
  ] },
  { grup: 'Arka plan', tekil: true, secenekler: [
    { key: 'zemin-koyu', label: 'Daha koyu', cmd: 'arka planı koyulaştır' },
    { key: 'zemin-acik', label: 'Daha açık', cmd: 'arka planı aç' },
  ] },
  { grup: 'Dekor', tekil: false, secenekler: [
    { key: 'no-isik', label: 'Işıksız', cmd: 'ışık kapat' },
    { key: 'no-elmas', label: 'Elmassız', cmd: 'elmasları kaldır' },
    { key: 'no-cerceve', label: 'Çerçevesiz', cmd: 'çerçeveyi kaldır' },
    { key: 'sade', label: 'Tamamen sade', cmd: 'sade' },
  ] },
  { grup: 'Köşe şerit', tekil: true, secenekler: [
    { key: 'serit-ucretsiz', label: 'ÜCRETSİZ', cmd: 'ücretsiz şerit' },
    { key: 'serit-kontenjan', label: 'Kontenjan sınırlı', cmd: 'kontenjan sınırlı' },
    { key: 'serit-son', label: 'Son fırsat', cmd: 'son fırsat' },
    { key: 'serit-yeni', label: 'Yeni', cmd: 'yeni şerit' },
  ] },
  { grup: 'İçerik', tekil: false, secenekler: [
    { key: 'no-qr', label: 'QR yok', cmd: 'qr kaldır' },
    { key: 'no-program', label: 'Program yok', cmd: 'program gizle' },
    { key: 'no-tarih', label: 'Tarih yok', cmd: 'tarih gizle' },
  ] },
];

export const MARKA_VARYASYON_INDEX = MARKA_VARYASYON.flatMap(g => g.secenekler.map(s => ({ ...s, grup: g.grup })));

// Hazır stil setleri — tek tıkla birden çok çip seçer
export const MARKA_PRESETLER = [
  { ad: '🌙 Lüks Gece', keys: ['tema-siyah', 'font-karisik', 'baslik-cift'] },
  { ad: '🤍 Zarif Krem', keys: ['tema-krem', 'font-zarif'] },
  { ad: '🌊 Kurumsal Lacivert', keys: ['tema-lacivert', 'font-modern'] },
  { ad: '🍷 Bordo Klasik', keys: ['tema-bordo', 'font-times', 'baslik-cift'] },
  { ad: '🥈 Sade Gümüş', keys: ['tema-gumus', 'sade'] },
];

// Tema kilitli yöntemlerde (marka-koyu/marka-acik) Tema grubu gizlenir
export const markaGruplar = (aiModel) =>
  aiModel === 'marka-afis' ? MARKA_VARYASYON : MARKA_VARYASYON.filter(g => g.grup !== 'Tema');

// Seçili çipleri ({key:true}) motor komut metnine çevirir
export const markaEkIstek = (secim) =>
  MARKA_VARYASYON_INDEX.filter(s => secim[s.key]).map(s => s.cmd).join(', ');
