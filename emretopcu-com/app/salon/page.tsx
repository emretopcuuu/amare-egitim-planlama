import type { Metadata } from "next";
import Salon from "@/components/Salon";

export const metadata: Metadata = {
  title: "Salon | Emre Topçu",
  description: "Sahne için tam ekran döngü.",
  robots: { index: false },
  alternates: { canonical: "/salon" },
};

export default function SalonSayfa() {
  return <Salon />;
}
