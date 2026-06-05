// _cors.mjs — Tutarlı CORS header'ları
//
// İki tip:
//   CORS_PUBLIC: Anonim erişime izin verilen endpoint'ler (dil-cevir, ical, kisalt)
//   CORS_PRIVATE: Auth gerektiren endpoint'ler — sadece kendi domain'lerimiz
//
// Auth gerektirenlerde CORS '*' olsa bile token kontrolü zaten korur,
// ama defense in depth — CSRF saldırılarında ek katman.

const IZINLI_ORIGINS = [
  'https://egitimtakvimi.oneteamglobal.ai',
  'https://oneteamglobal.ai',
  'https://www.oneteamglobal.ai',
  // OneTeam ekosistemi (2026-06-05: dil-cevir + diğer public endpoint'ler için genişletildi)
  'https://asistan.oneteamglobal.ai',
  'https://crm.oneteamglobal.ai',
  'https://hbb.oneteamglobal.ai',
  'https://hesaplayici.oneteamglobal.ai',
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8888',
];

export const CORS_PUBLIC = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Auth gerektiren endpoint'ler için — sadece izinli origin'lere izin
 * @param {Request} req
 * @returns {object} CORS headers
 */
export function corsPrivate(req) {
  const origin = req?.headers?.get?.('origin') || '';
  const izinli = IZINLI_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': izinli ? origin : IZINLI_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

/**
 * Preflight response
 */
export function corsPreflight(req, privateMode = true) {
  const headers = privateMode ? corsPrivate(req) : CORS_PUBLIC;
  return new Response(null, { status: 204, headers });
}
