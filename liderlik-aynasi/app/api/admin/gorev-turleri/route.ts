import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";
import { GOREV_TURLERI } from "@/lib/davranis";

// Görev Türü Stüdyosu: admin'in kapattığı görev türleri settings'e yazılır;
// AYNA üretirken (turSec) bu türleri atlar. En az bir tür açık kalmalı.
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const gecerli = GOREV_TURLERI as readonly string[];
  const ham: unknown = body?.kapali;
  const gelen: string[] = Array.isArray(ham)
    ? ham.filter((x): x is string => typeof x === "string")
    : [];
  const kapali = [...new Set(gelen)].filter((t) => gecerli.includes(t));
  if (kapali.length >= gecerli.length) {
    return NextResponse.json({ hata: "En az bir tür açık kalmalı." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert(
    {
      key: "kapali_gorev_turleri",
      value: JSON.stringify(kapali),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await yazAuditLog(db, session.sub, "gorev_turleri_guncellendi", { kapali }, req);
  return NextResponse.json({ tamam: true, kapali });
}
