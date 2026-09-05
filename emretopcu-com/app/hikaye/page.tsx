import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Hikâyenin Tamamı | Emre Topçu",
  description:
    "2003'ten bugüne: yolculuk, salonlar, videolar, sözler ve sorular — Emre Topçu'nun tam hikâyesi.",
  alternates: {
    canonical: "/hikaye",
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
  return <ZirveHikaye dil="tr" />;
}
