import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "La historia completa | Emre Topçu",
  description:
    "De 2003 a hoy: el camino, las salas, los vídeos, las palabras y las preguntas — la historia completa de Emre Topçu.",
  alternates: {
    canonical: "/es/hikaye",
    languages: {
      tr: "/hikaye",
      en: "/en/hikaye",
      de: "/de/hikaye",
      es: "/es/hikaye",
      ru: "/ru/hikaye",
      az: "/az/hikaye",
    },
  },
};

export default function HikayeSayfa() {
  return <ZirveHikaye dil="es" />;
}
