import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, Fraunces } from "next/font/google";
import { supabaseAdmin } from "@/lib/supabase/server";
import GolArkaplan from "@/components/gol/GolArkaplan";
import AltNav from "@/components/AltNav";
import BaglantiDurumu from "@/components/BaglantiDurumu";
import CanliTazele from "@/components/CanliTazele";
import AcilisSplash from "@/components/AcilisSplash";
import IlkKarsilama from "@/components/IlkKarsilama";
import AtlaBaglantisi from "@/components/AtlaBaglantisi";
import ProvaModuBayragi from "@/components/ProvaModuBayragi";
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
  metadataBase: new URL("https://ayna.oneteamglobal.ai"),
  title: "Liderlik Aynası",
  description: "360° liderlik değerlendirme — kampta kendini başkalarının gözünden gör.",
  // Link paylaşım kartı: gölün tan vakti karesi
  openGraph: {
    title: "Liderlik Aynası",
    description: "Kendini başkalarının gözünden gör.",
    url: "https://ayna.oneteamglobal.ai",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let provaAcik = false;
  try {
    const { data: prova } = await supabaseAdmin()
      .from("settings")
      .select("value")
      .eq("key", "prova_modu")
      .maybeSingle();
    provaAcik = prova?.value === "true";
  } catch {
    // Build-time prerendering may run without env vars — safe default
  }

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
              "try{var s=localStorage.getItem('la_yazi_boyu');var m={normal:'17.5px',buyuk:'19.5px',cokBuyuk:'22px'};if(s&&m[s])document.documentElement.style.fontSize=m[s];var tm=localStorage.getItem('la_tema')||'otomatik';var et=tm;if(tm==='otomatik'){var h=new Date().getHours();et=(h>=7&&h<19)?'gunduz':'gece';}document.documentElement.setAttribute('data-tema',et);}catch(e){document.documentElement.setAttribute('data-tema','gece');}",
          }}
        />
        {/* monitor.oneteamglobal.ai/api/track-visit beacon - One Team AI trafik takip */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var h=(location.hostname||'').toLowerCase();if(h.indexOf('localhost')>=0||h.indexOf('pages.dev')>=0||h.indexOf('railway.app')>=0)return;fetch('https://monitor.oneteamglobal.ai/api/track-visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site:'ayna',path:location.pathname||'/',referrer:document.referrer||null}),keepalive:true}).catch(function(){});}catch(e){}})();",
          }}
        />
        {/* #8 PROVA MODU: admin açarsa tüm sayfalarda kırmızı şerit çıkar */}
        {provaAcik && <ProvaModuBayragi />}
        <AtlaBaglantisi />
        {/* İlk açılışta tek seferlik ONE TEAM marka videosu */}
        <AcilisSplash />
        {/* GECE GÖLÜ tüm evrenin zemini: her ekran canlı gölün üstünde yaşar */}
        <GolArkaplan />
        {children}
        <AltNav />
        <IlkKarsilama />
        <BaglantiDurumu />
        <CanliTazele />
      </body>
    </html>
  );
}
