import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Direktvertriebs-Leader",
  description:
    "Presidential Diamond bei One Team Global. Ein Direktvertriebs-Leader, der Teams aufbaut, Führungskräfte entwickelt und alles mit System macht.",
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
  },
};

export default function HomeDe() {
  return <Zirve dil="de" />;
}
