import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, type Session } from "@/lib/auth/session-types";

const PUBLIC_ROUTES = [
  /^\/giris/,
  /^\/ekran/,
  /^\/sahne/, // projektör sayfası: bekleme döngüsü + Ayna Anı açılış filmi
  /^\/admin\/giris$/,
  /^\/api\/giris$/,
  /^\/api\/admin\/giris$/,
  /^\/api\/ekran$/, // büyük ekran verisi: isimsiz agregalar, oturumsuz erişilir
  /^\/api\/tik$/, // AYNA kalp atışı: cron çağırır, kendi gizli başlığıyla korunur
  /^\/api\/cron\//, // zamanlanmış işler (olaylar, akıllı dürtme): CRON_SECRET Bearer ile korunur
  /^\/api\/saglik$/, // healthcheck: oturumsuz, veri yok — Railway/yük dengeleyici probu
  // NOT: Mini 360 ekip değerlendirmesi artık GİRİŞLİ (ekip-içi, anonim). Eski
  // girişsiz /mini360/d ve /api/mini360/dis public rotaları kaldırıldı.
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ROUTES.some((r) => r.test(pathname))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let session: Session | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.SESSION_SECRET!)
      );
      session = payload as unknown as Session;
    } catch {
      // geçersiz/süresi dolmuş token → oturumsuz say
    }
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ hata: "Oturum gerekli." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    const adminMi = pathname.startsWith("/admin");
    url.pathname = adminMi ? "/admin/giris" : "/giris";
    // Hedefi koru: giriş sonrası kişi geldiği yere dönsün (örn. oda QR'ı
    // /ac?k=… — eskiden parametre silinip kamp açılmıyordu). Yalnız katılımcı
    // girişinde ve hedef anlamlıysa ekle.
    const hedef = pathname + (req.nextUrl.search || "");
    url.search = !adminMi && hedef !== "/" ? `?next=${encodeURIComponent(hedef)}` : "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    if (session.rol === "admin") return NextResponse.next();
    // Yardımcı görevli yalnız ana paneli (izleme) görür; diğer admin sayfaları
    // yöneticiye özel — kenarda (proxy) engellenir, sayfa guard'larına gerek yok.
    if (session.rol === "yardimci") {
      return pathname === "/admin"
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Statik varlıklar (görsel + ses efektleri) proxy'yi atlar → public /ekran,
    // /sahne dahil her yerde oturumsuz yüklenir. mp3/wav/ogg: public/sfx sesleri.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|mp3|wav|ogg|mp4|webm)).*)",
  ],
};
