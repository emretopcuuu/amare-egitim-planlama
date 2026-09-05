import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Direktvertriebs-Leader",
  description:
    "OneTeam-Mitgründer mit über 200.000 Menschen auf 4 Kontinenten — er bildet Direktvertriebs-Profis aus und baut skalierbare Systeme.",
  alternates: {
    canonical: "/de",
    languages: {
      tr: "/",
      en: "/en",
      de: "/de",
      es: "/es",
      ru: "/ru",
      az: "/az",
    },
  },
  openGraph: {
    title: "Emre Topçu | Nicht addieren, multiplizieren.",
    description:
      "Ein Direktvertriebs-Leader, der Teams aufbaut und Führungskräfte mit System entwickelt.",
    url: "https://emretopcu.ai/de",
    siteName: "Emre Topçu",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/og-de.png", width: 1200, height: 630 }],
  },
};

export default function HomeDe() {
  return <Zirve dil="de" />;
}
