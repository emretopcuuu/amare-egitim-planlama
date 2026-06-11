import "server-only";
import { getSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/session-types";

// /api/admin/* rotaları proxy'den yalnızca "oturum var" kontrolüyle geçer;
// rol kontrolü her admin API rotasında bu yardımcıyla yapılır.
export async function adminOturumu(): Promise<Session | null> {
  const session = await getSession();
  return session && session.rol === "admin" ? session : null;
}
