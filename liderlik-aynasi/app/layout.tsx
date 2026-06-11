import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Liderlik Aynası",
  description: "360° liderlik değerlendirme — kampta kendini başkalarının gözünden gör.",
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
  themeColor: "#1e1233",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
