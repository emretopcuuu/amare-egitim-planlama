import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Эмре Топчу | Лидер прямых продаж",
  description:
    "Presidential Diamond в One Team Global. Лидер прямых продаж, который строит команды, растит лидеров и делает это системно.",
  alternates: {
    canonical: "/ru",
    languages: { tr: "/", en: "/en", ru: "/ru", az: "/az" },
  },
  openGraph: {
    title: "Эмре Топчу | Не добавление, а умножение.",
    description:
      "Лидер прямых продаж, который строит команды и растит лидеров системно.",
    url: "https://emretopcu.ai/ru",
    siteName: "Emre Topçu",
    locale: "ru_RU",
    type: "website",
  },
};

export default function HomeRu() {
  return <Zirve dil="ru" />;
}
