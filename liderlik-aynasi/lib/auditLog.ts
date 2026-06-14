import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Kritik admin eylemlerini audit_log tablosuna yazar.
// Hata fırlatmaz: günlük yazma başarısız olsa bile asıl eylem etkilenmesin.
export async function yazAuditLog(
  db: SupabaseClient,
  adminId: string | null,
  eylem: string,
  detay: Record<string, unknown> = {},
  req?: NextRequest
) {
  try {
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("x-real-ip") ??
      null;
    await db.from("audit_log").insert({ admin_id: adminId, eylem, detay, ip });
  } catch {
    // sessizce yok say
  }
}
