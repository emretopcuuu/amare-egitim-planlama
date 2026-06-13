import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, type Session } from "@/lib/auth/session-types";

export { SESSION_COOKIE, type Session };

// Kamp 3 gün + 90 günlük yolculuk + tampon: aday tüm program boyunca tek kez
// giriş yapsın, bir daha kod sormasın. ~120 gün.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 120;

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}

export async function createSession(session: Session) {
  const jwt = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  // sameSite 'lax' şart: QR linki (/giris?kod=) cross-site top-level navigasyondur.
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
