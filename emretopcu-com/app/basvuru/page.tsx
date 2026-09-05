import type { Metadata } from "next";
import TersMulakat from "@/components/TersMulakat";

export const metadata: Metadata = {
  title: "Görüşmeye Başvur | Emre Topçu",
  description:
    "Ters mülakat: 5 soru, 3-4 dakika. Cevapların görüşme dosyana dönüşür; Emre karşına seni tanıyarak çıkar.",
  alternates: { canonical: "/basvuru" },
};

export default function BasvuruSayfa() {
  return (
    <main className="perde-koyu min-h-[100dvh] bg-abanoz font-sahne text-fildisi">
      <TersMulakat />
    </main>
  );
}
