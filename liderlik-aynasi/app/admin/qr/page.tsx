import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import YazdirButonu from "./YazdirButonu";
import Ipucu from "../Ipucu";

export const metadata = { title: "QR Kartlar — Liderlik Aynası" };

export default async function QrPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const [{ data: kisiler, error }, istekBasliklari] = await Promise.all([
    supabaseAdmin()
      .from("participants")
      .select("id, full_name, team, login_code")
      .eq("role", "participant")
      .order("full_name"),
    headers(),
  ]);
  if (error) throw error;

  // QR, kartın basılacağı ortamın kendi adresini taşımalı: host'tan türetilir.
  const host = istekBasliklari.get("host") ?? "localhost:3000";
  const proto = istekBasliklari.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const kartlar = await Promise.all(
    kisiler.map(async (k) => ({
      ...k,
      // QR → giriş → kişisel yansıma videosu (varsa oynar, yoksa /yansiman
      // sessizce ana sayfaya yönlendirir): "video varsa göster, yoksa geç".
      svg: await QRCode.toString(
        `${origin}/giris?kod=${k.login_code}&next=${encodeURIComponent("/yansiman")}`,
        {
          type: "svg",
          margin: 1,
          errorCorrectionLevel: "M",
        }
      ),
    }))
  );

  const t = tr.admin.qr;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 print:max-w-none print:space-y-0 print:p-0">
      <header className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
            <Ipucu {...tr.admin.yardim.qr} />
          </div>
          <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
        </div>
        <YazdirButonu />
      </header>

      {kartlar.length === 0 ? (
        <p className="text-sm text-slate-400 print:hidden">{t.katilimciYok}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-2 print:gap-2">
          {kartlar.map((k) => (
            <div
              key={k.id}
              className="break-inside-avoid overflow-hidden rounded-xl bg-white text-center text-black shadow print:rounded-none print:border print:border-gray-300 print:shadow-none"
            >
              {/* ONE TEAM marka bandı */}
              <div className="bg-black px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/oneteam-logo.jpg"
                  alt="ONE TEAM"
                  className="mx-auto h-12 w-auto object-contain"
                />
              </div>
              <div className="p-4">
              <p className="break-words text-base font-bold leading-tight">{k.full_name}</p>
              {k.team && <p className="text-xs text-gray-600">{k.team}</p>}
              <div
                className="mx-auto mt-2 w-full max-w-40 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: k.svg }}
              />
              <p className="mt-2 font-mono text-lg font-bold tracking-widest">
                {k.login_code}
              </p>
              <p className="text-[10px] text-gray-500">{t.kartAltyazi}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
