import type { Metadata } from "next";
import DosyaGoruntule from "@/components/DosyaGoruntule";

export const metadata: Metadata = {
  title: "Görüşme Dosyası | Emre Topçu",
  description: "Görüşme dosyası görüntüleme.",
  robots: { index: false, follow: false },
};

export default function DosyaSayfa() {
  return (
    <main className="perde-koyu min-h-[100dvh] bg-abanoz font-sahne text-fildisi">
      <DosyaGoruntule />
    </main>
  );
}
