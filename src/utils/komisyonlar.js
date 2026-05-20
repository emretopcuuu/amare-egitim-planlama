// OneTeam Komisyonlar — sabit meta veri
// id, ad, kısa açıklama, ikon, tema. İçerik (özet, üyeler, yaptıkları işler)
// Firestore'da komisyonlar/{id} doc'unda saklanır, admin tarafından düzenlenir.

import {
  GraduationCap, Settings2, Package, Smartphone,
  HeartHandshake, Award, Globe2, UsersRound, LineChart, Scale, Tent,
} from 'lucide-react';

export const KOMISYONLAR = [
  {
    id: 'egitim',
    ad: 'OneTeam Eğitim Komisyonu',
    kisaAd: 'Eğitim',
    aciklama: 'Eğitim takvimi, eğitmenler ve kayıtlı eğitimler',
    icon: GraduationCap,
    aktif: true,
    adminRota: '/admin-giris', // Eğitim için mevcut admin paneli
    tagline: 'OneTeam üyelerinin gelişim yolculuğunu planlar ve yönetir',
    renk: 'amber', // tema rengi
  },
  {
    id: 'sistem',
    ad: 'OneTeam Sistem Komisyonu',
    kisaAd: 'Sistem',
    aciklama: 'Yapı, süreç ve standartlar',
    icon: Settings2,
    aktif: false,
    tagline: 'OneTeam ekosisteminin işleyişini tasarlar ve standardize eder',
    renk: 'blue',
  },
  {
    id: 'urun',
    ad: 'OneTeam Ürün Komisyonu',
    kisaAd: 'Ürün',
    aciklama: 'Ürün bilgisi, eğitim ve içerik',
    icon: Package,
    aktif: false,
    tagline: 'Amare ürünlerini derinlemesine tanıtır ve eğitim içerikleri hazırlar',
    renk: 'emerald',
  },
  {
    id: 'teknoloji',
    ad: 'OneTeam Teknoloji ve Sosyal Medya Komisyonu',
    kisaAd: 'Teknoloji & Sosyal Medya',
    aciklama: 'Dijital platformlar ve içerik üretimi',
    icon: Smartphone,
    aktif: false,
    tagline: 'Dijital varlığımızı güçlendirir, sosyal medya stratejileri üretir',
    renk: 'cyan',
  },
  {
    id: 'yardim-eli',
    ad: 'OneTeam Yardım Eli Komisyonu',
    kisaAd: 'Yardım Eli',
    aciklama: 'Yardımlaşma ve dayanışma faaliyetleri',
    icon: HeartHandshake,
    aktif: false,
    tagline: 'İhtiyaç sahibi üyelerimize destek olur, dayanışmayı büyütür',
    renk: 'rose',
  },
  {
    id: 'takdir',
    ad: 'OneTeam Takdir Komisyonu',
    kisaAd: 'Takdir',
    aciklama: 'Başarı ödülleri ve takdir programları',
    icon: Award,
    aktif: false,
    tagline: 'Başarıları takdir eder, motivasyon kültürünü canlı tutar',
    renk: 'amber',
  },
  {
    id: 'dis-isleri',
    ad: 'OneTeam Dış İşleri ve Stratejik İletişim Komisyonu',
    kisaAd: 'Dış İşleri & İletişim',
    aciklama: 'Kurumsal ilişkiler ve stratejik iletişim',
    icon: Globe2,
    aktif: false,
    tagline: 'Dış paydaşlarla ilişkileri yönetir, stratejik iletişimi yürütür',
    renk: 'indigo',
  },
  {
    id: 'sosyal-kulupler',
    ad: 'OneTeam Sosyal Kulüpler Komisyonu',
    kisaAd: 'Sosyal Kulüpler',
    aciklama: 'İlgi alanı bazlı topluluk yönetimi',
    icon: UsersRound,
    aktif: false,
    tagline: 'Ortak ilgilere sahip üyeleri buluşturan kulüpleri organize eder',
    renk: 'purple',
  },
  {
    id: 'butce',
    ad: 'OneTeam Bütçe Denetim ve Yatırım Komisyonu',
    kisaAd: 'Bütçe & Yatırım',
    aciklama: 'Finansal denetim ve yatırım planlaması',
    icon: LineChart,
    aktif: false,
    tagline: 'Şeffaf finansal yönetim ve sürdürülebilir yatırım planları geliştirir',
    renk: 'green',
  },
  {
    id: 'hukuk',
    ad: 'OneTeam Hukuk Komisyonu',
    kisaAd: 'Hukuk',
    aciklama: 'Yasal süreçler ve uyumluluk',
    icon: Scale,
    aktif: false,
    tagline: 'Üyelerimizin hukuki süreçlerinde rehberlik eder, uyumluluğu sağlar',
    renk: 'slate',
  },
  {
    id: 'kamp',
    ad: 'OneTeam Kamp Komisyonu',
    kisaAd: 'Kamp',
    aciklama: 'Eğitim kampları ve etkinlikler',
    icon: Tent,
    aktif: false,
    tagline: 'Yoğun eğitim kampları ve bağ kuran ekosistem etkinlikleri düzenler',
    renk: 'orange',
  },
];

// id'den komisyon bulma
export const getKomisyon = (id) => KOMISYONLAR.find(k => k.id === id) || null;

// Sadece Emre düzenleyebilir (komisyon admin)
export const COMISSION_EDITOR_EMAIL = 's.emretopcu@gmail.com';
export const canEditKomisyon = (email) =>
  !!email && String(email).toLowerCase().trim() === COMISSION_EDITOR_EMAIL;
