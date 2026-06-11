import EkranGosterisi from "./EkranGosterisi";

export const metadata = { title: "Kampın Nabzı — Liderlik Aynası" };

// Sahneye yansıtılan büyük ekran. Sayfa herkese açıktır; tüm veri
// /api/ekran'dan gelir ve isimsiz agregalardan ibarettir.
export default function EkranPage() {
  return <EkranGosterisi />;
}
