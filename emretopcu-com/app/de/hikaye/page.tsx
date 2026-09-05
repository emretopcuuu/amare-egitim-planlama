import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Die ganze Geschichte | Emre Topçu",
  description:
    "Von 2003 bis heute: der Weg, die Säle, die Videos, die Worte und die Fragen — die ganze Geschichte von Emre Topçu.",
  alternates: {
    canonical: "/de/hikaye",
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
  return <ZirveHikaye dil="de" />;
}
