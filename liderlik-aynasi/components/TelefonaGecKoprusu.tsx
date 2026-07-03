import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { BAGLANTI_TABANI } from "@/lib/whatsappSablonlari";

// [UX6] MASAÜSTÜ → TELEFON KÖPRÜSÜ — onboarding'i bilgisayardan açan kişiye
// (canlı testte görüldü) telefona geçiş QR'ı. Push bildirimi, PWA kurulumu ve
// sesli yaz hepsi telefonda yaşıyor; yolculuk orada sürmeli. YALNIZ ince
// imleçli geniş ekranlarda görünür (CSS media query — UA koklama yok).
export default async function TelefonaGecKoprusu() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return null;

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("login_code")
    .eq("id", session.sub)
    .maybeSingle();
  if (!kisi?.login_code) return null;

  const url = `${BAGLANTI_TABANI}/giris?kod=${kisi.login_code}`;
  const qr = await QRCode.toDataURL(url, {
    width: 168,
    margin: 1,
    color: { dark: "#0a1826", light: "#f6f0dc" },
  });

  return (
    <aside className="mx-auto hidden w-full max-w-md items-center gap-4 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4 [@media(pointer:fine)_and_(min-width:1024px)]:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Telefonla giriş QR kodu" className="h-24 w-24 shrink-0 rounded-lg" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-gold-light">📱 Bu yolculuk telefonda daha iyi</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Bildirimler, sesli yazma ve kamp akışı telefonda yaşar. Kameranla QR&apos;ı okut —
          kaldığın yerden telefonunda devam et.
        </p>
      </div>
    </aside>
  );
}
