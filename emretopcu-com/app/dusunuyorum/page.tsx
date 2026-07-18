import type { Metadata } from "next";
import KararTesti from "@/components/KararTesti";

export const metadata: Metadata = {
  title: "Doğrudan satışı düşünüyor musun? | Emre Topçu",
  description:
    "Üç kısa soru. Cevaplarına göre sana özel notlar ve bir sonraki adım.",
  alternates: { canonical: "/dusunuyorum" },
};

export default function Dusunuyorum() {
  return (
    <main className="min-h-[100dvh] bg-abanoz font-sahne text-fildisi">
      <KararTesti />
    </main>
  );
}
