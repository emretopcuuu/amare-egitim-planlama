import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// service_role anahtarı RLS'i bypass eder; bu modül 'server-only' sayesinde
// asla istemci paketine giremez. Tüm veri erişimi bu istemci üzerinden,
// yetkilendirme uygulama katmanında yapılır.
export function supabaseAdmin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
