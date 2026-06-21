import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PENCERE_DK, limitAsildiMi } from "./rateLimitKural";

// DB tabanlı limit: Vercel'in stateless lambda'larında bellek içi sayaç tutmaz.
// Eşikler + saf karar lib/auth/rateLimitKural.ts'te (test edilebilirlik).

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function isRateLimited(ip: string): Promise<boolean> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - PENCERE_DK * 60_000).toISOString();

  const [perIp, global] = await Promise.all([
    db
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since),
    db
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("success", false)
      .gte("created_at", since),
  ]);

  return limitAsildiMi(perIp.count ?? 0, global.count ?? 0);
}

export async function recordAttempt(ip: string, success: boolean) {
  await supabaseAdmin().from("login_attempts").insert({ ip, success });
}
