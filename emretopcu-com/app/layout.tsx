import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://emretopcu.com"),
  title: "Emre Topçu | Liderlik, ekip ve sistem",
  description:
    "One Team Global lideri Emre Topçu. Ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir network marketing lideri.",
  openGraph: {
    title: "Emre Topçu | Liderlik, ekip ve sistem",
    description:
      "Ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir network marketing lideri.",
    url: "https://emretopcu.com",
    siteName: "Emre Topçu",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={outfit.variable}>
      <body className="bg-ink text-bone font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
