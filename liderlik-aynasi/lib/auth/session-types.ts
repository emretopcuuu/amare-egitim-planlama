// proxy.ts (Edge) ile sunucu kodu arasında paylaşılan sabitler.
// Bu modül bilinçli olarak 'server-only' içermez: next/headers'a bağımlı
// session.ts proxy'ye import edilemez.
export const SESSION_COOKIE = "la_oturum";

export type Session = {
  sub: string; // participants.id
  ad: string; // full_name
  rol: "participant" | "admin";
};
