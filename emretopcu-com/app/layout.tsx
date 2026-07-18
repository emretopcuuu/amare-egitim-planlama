import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { jsonLd } from "@/lib/jsonld";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

// Lüks serif — başlıklar ve "beyan" cümleleri (Fraunces 600, TR subset'li).
const fraunces = localFont({
  src: "./fonts/fraunces-600.woff2",
  weight: "600",
  variable: "--font-fraunces",
  display: "swap",
});

// El yazısı — imza (gerçek imza SVG'siyle değiştirilebilir).
const imza = localFont({
  src: "./fonts/greatvibes.woff2",
  variable: "--font-greatvibes",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://emretopcu.ai"),
  title: "Emre Topçu | Doğrudan satış lideri",
  description:
    "One Team Global Presidential Diamond lideri Emre Topçu. Ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir doğrudan satış lideri.",
  keywords: [
    "Emre Topçu",
    "doğrudan satış",
    "One Team Global",
    "Presidential Diamond",
    "liderlik",
    "İlk 72 Saat",
  ],
  authors: [{ name: "Emre Topçu", url: "https://emretopcu.ai" }],
  creator: "Emre Topçu",
  openGraph: {
    title: "Emre Topçu | Ekleme değil, katlama.",
    description:
      "Ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir doğrudan satış lideri.",
    url: "https://emretopcu.ai",
    siteName: "Emre Topçu",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Emre Topçu — Ekleme değil, katlama." }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${outfit.variable} ${fraunces.variable} ${imza.variable}`}
    >
      <body className="antialiased">
        {/* Google + AI araçları için yapılandırılmış veri (Person/Book/FAQ). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        {/* Tema, boyanmadan önce ayarlanır (FOUC yok). Kayıtlı tercih yoksa
            gece 21:00–07:00 arası varsayılan gece; kullanıcı seçince sabitlenir. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='emretopcu_tema',v=localStorage.getItem(k);if(v!=='gunduz'&&v!=='gece'){var h=new Date().getHours();v=(h>=21||h<7)?'gece':'gunduz';}document.documentElement.dataset.tema=v;}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
