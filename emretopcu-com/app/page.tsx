import type { Metadata } from "next";
import Zirve from "@/components/varyantlar/Zirve";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: { tr: "/", en: "/en", de: "/de", es: "/es", ru: "/ru", az: "/az" },
  },
};

export default function AnaSayfa() {
  return <Zirve dil="tr" />;
}
