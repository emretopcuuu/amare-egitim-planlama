import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Birbaşa satış lideri",
  description:
    "One Team Global-da Presidential Diamond. Komandalar quran, liderlər yetişdirən və bu işi sistemlə görən bir birbaşa satış lideri.",
  alternates: {
    canonical: "/az",
    languages: { tr: "/", en: "/en", de: "/de", es: "/es", ru: "/ru", az: "/az" },
  },
  openGraph: {
    title: "Emre Topçu | Əlavə etmək yox, qatlamaq.",
    description:
      "Komandalar quran, liderlər yetişdirən və bu işi sistemlə görən bir birbaşa satış lideri.",
    url: "https://emretopcu.ai/az",
    siteName: "Emre Topçu",
    locale: "az_AZ",
    type: "website",
  },
};

export default function HomeAz() {
  return <Zirve dil="az" />;
}
