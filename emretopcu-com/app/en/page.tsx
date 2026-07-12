import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  title: "Emre Topçu | Leadership, team and system",
  description:
    "Presidential Diamond at One Team Global. A direct-sales leader who builds teams, raises leaders, and does it all with a system.",
  alternates: {
    canonical: "/en",
    languages: { tr: "/", en: "/en" },
  },
  openGraph: {
    title: "Emre Topçu | Leadership, team and system",
    description:
      "A direct-sales leader who builds teams, raises leaders, and does it all with a system.",
    url: "https://emretopcu.ai/en",
    siteName: "Emre Topçu",
    locale: "en_US",
    type: "website",
  },
};

export default function HomeEn() {
  return <Zirve dil="en" />;
}
