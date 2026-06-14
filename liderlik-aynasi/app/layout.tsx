import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, Fraunces } from "next/font/google";
import GolArkaplan from "@/components/gol/GolArkaplan";
import AltNav from "@/components/AltNav";
import BaglantiDurumu from "@/components/BaglantiDurumu";
import AtlaBaglantisi from "@/components/AtlaBaglantisi";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// Başlıklarda kullanılan vitrin serifi — "ayna/mistik" marka dili
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

// PRİZMA evreninin editoryal serifi
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://liderlik-aynasi.vercel.app"),
  title: "Liderlik Aynası",
  description: "360° liderlik değerlendirme — kampta kendini başkalarının gözünden gör.",
  // Link paylaşım kartı: gölün tan vakti karesi
  openGraph: {
    title: "Liderlik Aynası",
    description: "Kendini başkalarının gözünden gör.",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  // PWA: iOS ana ekran kurulumu (push bildirimleri için şart)
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "AYNA" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iOS, 16px altı inputa odaklanınca sayfayı yakınlaştırıp yatay kaydırma
  // yaratıyor; kamp uygulamasında zoom kapalı — ekran sabit kalsın.
  maximumScale: 1,
  userScalable: false,
  // #3 Klavye açılınca içerik küçülsün: alttaki buton/aksiyon klavyenin
  // arkasında kaybolmasın, başparmak erişiminde kalsın.
  interactiveWidget: "resizes-content",
  themeColor: "#06121e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Kayıtlı yazı boyutunu boyamadan önce uygula — büyütülmüş yazıda
            sayfa "küçükten büyüğe" zıplamasın (FOUC önleme). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=localStorage.getItem('la_yazi_boyu');var m={normal:'17.5px',buyuk:'19.5px',cokBuyuk:'22px'};if(s&&m[s])document.documentElement.style.fontSize=m[s];if(localStorage.getItem('la_gunes_modu')==='1')document.body.classList.add('gunes-modu');}catch(e){}",
          }}
        />
        <AtlaBaglantisi />
        {/* GECE GÖLÜ tüm evrenin zemini: her ekran canlı gölün üstünde yaşar */}
        <GolArkaplan />
        {children}
        <AltNav />
        <BaglantiDurumu />
      </body>
    </html>
  );
}
