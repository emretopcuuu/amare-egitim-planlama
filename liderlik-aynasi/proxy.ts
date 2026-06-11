import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, type Session } from "@/lib/auth/session-types";

const PUBLIC_ROUTES = [
  /^\/giris/,
  /^\/ekran/,
  /^\/admin\/giris$/,
  /^\/api\/giris$/,
  /^\/api\/admin\/giris$/,
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
    url.pathname = pathname.startsWith("/admin") ? "/admin/giris" : "/giris";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.rol !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)).*)",
  ],
};
