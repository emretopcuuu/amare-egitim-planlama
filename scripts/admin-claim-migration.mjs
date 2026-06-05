// scripts/admin-claim-migration.mjs
// ─────────────────────────────────────────────────────────────────────────
// 2026-06-05 audit (#2): Mevcut 9 admin'e Firebase Custom Claim atar.
//
// Kullanım:
//   ADMIN_CLAIM_SECRET=<secret> node scripts/admin-claim-migration.mjs
//
// Veya doğrudan:
//   node scripts/admin-claim-migration.mjs <secret>
//
// Output: her admin için OK / ERROR. Admin'lerin claim'i kullanması için
// logout/login yapması gerek (token 1sa içinde yenilenir).
//
// Sonradan admin ekleme:
//   curl -X POST https://egitimtakvimi.oneteamglobal.ai/.netlify/functions/admin-claim-ata \
//     -H "x-admin-claim-secret: <secret>" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"yeni-admin@gmail.com","admin":true}'
// ─────────────────────────────────────────────────────────────────────────

const SECRET = process.env.ADMIN_CLAIM_SECRET || process.argv[2];
if (!SECRET || SECRET.length < 16) {
  console.error('ADMIN_CLAIM_SECRET eksik (env veya argv[2])');
  process.exit(1);
}

const ENDPOINT = 'https://egitimtakvimi.oneteamglobal.ai/.netlify/functions/admin-claim-ata';

const ADMINS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
  'ilknurakkas17@gmail.com',
  'giray70@gmail.com',
  'furkancite@gmail.com',
];

(async () => {
  for (const email of ADMINS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'x-admin-claim-secret': SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, admin: true }),
      });
      const data = await res.json();
      const tag = res.ok && data.ok ? '✓' : '✗';
      console.log(`${tag} ${email.padEnd(35)} ${res.status} ${data.ok ? 'claim atandı' : (data.error || 'fail')}`);
    } catch (e) {
      console.log(`✗ ${email.padEnd(35)} HATA ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // rate-limit dostu
  }
  console.log('');
  console.log('NEXT: Her admin bir kez Çıkış→Giriş yapsın. Token yenilenince claim aktif olur.');
  console.log('Migration test edildikten sonra (1-2 hafta) firestore.rules + storage.rules + constants.js\'ten');
  console.log('eski email listesi kaldırılabilir (bundle\'dan phishing target çıkar).');
})();
