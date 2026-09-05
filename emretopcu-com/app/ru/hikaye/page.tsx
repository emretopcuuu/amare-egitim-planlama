import type { Metadata } from "next";
import { ZirveHikaye } from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Вся история | Эмре Топчу",
  description:
    "С 2003 года до сегодня: путь, залы, видео, слова и вопросы — вся история Эмре Топчу.",
  alternates: {
    canonical: "/ru/hikaye",
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
  return <ZirveHikaye dil="ru" />;
}
