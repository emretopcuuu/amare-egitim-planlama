import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Hekayənin tamamı | Emre Topçu",
  description:
    "2003-dən bu günə: yolçuluq, salonlar, videolar, sözlər və suallar — Emre Topçunun tam hekayəsi.",
  alternates: {
    canonical: "/az/hikaye",
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
  return <ZirveHikaye dil="az" />;
}
