import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Líder de venta directa",
  description:
    "Cofundador de OneTeam con más de 200.000 personas en 4 continentes: forma a profesionales de la venta directa y construye sistemas escalables.",
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
    images: [{ url: "/og-es.png", width: 1200, height: 630 }],
  },
};

export default function HomeEs() {
  return <Zirve dil="es" />;
}
