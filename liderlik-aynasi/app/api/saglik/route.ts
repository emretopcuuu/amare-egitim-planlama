import { NextResponse } from "next/server";

// Faz 0 (ölçek göçü): Railway/yük dengeleyici sağlık probu. Hafif, oturumsuz,
// veritabanına dokunmaz — yalnız sürecin ayakta olduğunu doğrular.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
