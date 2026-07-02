import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sozGetir, taniklar, bekleyenImzalar, sozV2KapisiAcik } from "@/lib/soz";
import { sozMuhurDurumu } from "@/lib/sozMuhur";
import { tr } from "@/lib/i18n/tr";
import SozV2Akis from "./SozV2Akis";
import SozMuhurFinal from "./SozMuhurFinal";

export const metadata = { title: "Sözün — Liderlik Aynası" };

// FAZ A — Söz v2 (kapanış). AI şekillendirir → kişi düzenler → kendi sesiyle
// okur/kaydeder → 5 lider şahit imzalar. soz_v2_acik açıkken erişilir.
export default async function SozumSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const acik = await sozV2KapisiAcik(db);

  if (!acik) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">📜</p>
        <p className="mt-4 max-w-sm text-slate-300">{tr.sozV2.kapali}</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">
          {tr.degerlendir.anaSayfayaDon}
        </Link>
      </main>
    );
  }

  const [soz, tanikList, bekleyen, { data: liderler }, { data: ben }, muhurDurum] =
    await Promise.all([
      sozGetir(db, session.sub),
      taniklar(db, session.sub),
      bekleyenImzalar(db, session.sub),
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant")
        .neq("id", session.sub)
        .order("full_name"),
      db.from("participants").select("camp_unlock_token").eq("id", session.sub).maybeSingle(),
      sozMuhurDurumu(db),
    ]);

  // [E3] Yüz yüze şahitlik QR'ı: şahitler bunu okutup söze imza atar.
  const token = ben?.camp_unlock_token ?? null;
  let qrSvg = "";
  if (token) {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host") ?? "ayna.oneteamglobal.ai";
    qrSvg = await QRCode.toString(`${proto}://${host}/sahit?u=${token}`, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
    }).catch(() => "");
  }

  // [E2] Söz mühürlendiyse (kendi sesiyle okundu) İlk 72 Saat kartına yönlendir.
  const sozMuhurlu = !!soz?.voice_path || soz?.durum === "onaylandi";

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <SozV2Akis
        soz={soz}
        taniklar={tanikList}
        bekleyenImzalar={bekleyen}
        liderler={(liderler ?? []).map((l) => ({ id: l.id, ad: l.full_name, takim: l.team }))}
      />
      {sozMuhurlu && qrSvg && <SozMuhurFinal qrSvg={qrSvg} ilkDurum={muhurDurum} />}
      {sozMuhurlu && (
        <div className="mx-auto w-full max-w-md px-5 pb-8">
          <Link
            href="/ilk-72-saat"
            className="flex items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-gold/[0.08] px-5 py-4 transition-colors hover:bg-gold/[0.14]"
          >
            <div>
              <p className="text-sm font-semibold text-gold-light">⏳ İlk 72 Saat</p>
              <p className="mt-0.5 text-xs text-slate-300">Sözünü sahaya indir — üç adımı ne zaman yapacağını seç.</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-gold-light">Aç →</span>
          </Link>
        </div>
      )}
    </main>
  );
}
