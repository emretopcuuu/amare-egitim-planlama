import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Leadership, team and system",
  description:
    "Co-founder of OneTeam with 200,000+ people across 4 continents — training direct-sales professionals and building scalable systems.",
  alternates: {
    canonical: "/en",
    languages: { tr: "/", en: "/en", de: "/de", es: "/es", ru: "/ru", az: "/az" },
  },
  openGraph: {
    title: "Emre Topçu | Leadership, team and system",
    description:
      "A direct-sales leader who builds teams, raises leaders, and does it all with a system.",
    url: "https://emretopcu.ai/en",
    siteName: "Emre Topçu",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og-en.png", width: 1200, height: 630 }],
  },
};

export default function HomeEn() {
  return <Zirve dil="en" />;
}
