import "server-only";
import { getSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/session-types";

// /api/admin/* rotaları proxy'den yalnızca "oturum var" kontrolüyle geçer;
// rol kontrolü her admin API rotasında bu yardımcıyla yapılır.
// adminOturumu: TAM yetki — kritik (kamp akışını değiştiren) tüm rotalar bunu
// kullanır. Yardımcı görevli reddedilir (sızıntı kapısı: API katmanı).
export async function adminOturumu(): Promise<Session | null> {
  const session = await getSession();
  return session && session.rol === "admin" ? session : null;
}

// yetkiliOturumu: admin VEYA yardımcı görevli. Yalnız güvenli/izleme rotaları
// (örn. eksik dürtme) bunu kullanır — kamp durumunu değiştirmez.
export async function yetkiliOturumu(): Promise<Session | null> {
  const session = await getSession();
  return session && (session.rol === "admin" || session.rol === "yardimci")
    ? session
    : null;
}
