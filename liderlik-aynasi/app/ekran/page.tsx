import EkranGosterisi from "./EkranGosterisi";
import MarkaAcilis from "./MarkaAcilis";

export const metadata = { title: "Kampın Nabzı — Liderlik Aynası" };

// Sahneye yansıtılan büyük ekran. Sayfa herkese açıktır; tüm veri
// /api/ekran'dan gelir ve isimsiz agregalardan ibarettir. Açılışta ONE TEAM
// marka videosu bir kez oynar, sonra canlı nabız belirir.
export default function EkranPage() {
  return (
    <>
      <MarkaAcilis />
      <EkranGosterisi />
    </>
  );
}
