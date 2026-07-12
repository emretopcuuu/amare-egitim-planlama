import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: { tr: "/", en: "/en" },
  },
};

export default function AnaSayfa() {
  return <Zirve dil="tr" />;
}
