// Tüm rank değerlerini grup say
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Star geçen tüm rütbeleri çek
const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?select=rank,amare_id&rank=ilike.*Star*&limit=2000`;
const res = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
const rows = await res.json();
const sayim = {};
for (const r of rows) {
  const k = r.rank || '(boş)';
  sayim[k] = (sayim[k] || 0) + 1;
}
console.log('Star geçen rütbeler:');
[...Object.entries(sayim)].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
  console.log(`  ${n.toString().padStart(5)}  ${k}`);
});
// + Presidential
const url2 = `${SUPABASE_URL}/rest/v1/amare_raw_members?select=rank&rank=ilike.*resi*&limit=2000`;
const res2 = await fetch(url2, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
const rows2 = await res2.json();
const sayim2 = {};
for (const r of rows2) {
  const k = r.rank || '(boş)';
  sayim2[k] = (sayim2[k] || 0) + 1;
}
console.log('\nPresidential rütbeler:');
[...Object.entries(sayim2)].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
  console.log(`  ${n.toString().padStart(5)}  ${k}`);
});
process.exit(0);
