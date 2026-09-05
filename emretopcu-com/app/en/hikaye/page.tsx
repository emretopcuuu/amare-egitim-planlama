import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "The Full Story | Emre Topçu",
  description:
    "From 2003 to today: the journey, the halls, the videos, the words and the questions — Emre Topçu's full story.",
  alternates: {
    canonical: "/en/hikaye",
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
  return <ZirveHikaye dil="en" />;
}
