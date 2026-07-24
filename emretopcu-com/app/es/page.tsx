import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Líder de venta directa",
  description:
    "Presidential Diamond en One Team Global. Un líder de venta directa que construye equipos, forma líderes y lo hace todo con un sistema.",
  alternates: {
    canonical: "/es",
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
    title: "Emre Topçu | No sumar, multiplicar.",
    description:
      "Un líder de venta directa que construye equipos y forma líderes con un sistema.",
    url: "https://emretopcu.ai/es",
    siteName: "Emre Topçu",
    locale: "es_ES",
    type: "website",
  },
};

export default function HomeEs() {
  return <Zirve dil="es" />;
}
