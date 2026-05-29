// scripts/yurutme-kurulu-listele.mjs
// Star Diamond, Two Star Diamond, Three Star Diamond, Presidential Diamond
// rütbelerindeki tüm Amare üyelerini Supabase'den çek ve listele.

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY eksik'); process.exit(1); }

const RANKS = [
  'Presidential Diamond',
  '3-Star Diamond',
  '2-Star Diamond',
  '1-Star Diamond',
];

async function fetchByRank(rank) {
  const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?select=amare_id,full_name,rank,email,phone,country&rank=eq.${encodeURIComponent(rank)}&order=full_name.asc&limit=500`;
  const res = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!res.ok) {
    console.warn(`  ⚠ ${rank}: ${res.status}`);
    return [];
  }
  return res.json();
}

const all = {};
for (const r of RANKS) {
  const rows = await fetchByRank(r);
  if (rows.length === 0) continue;
  all[r] = rows;
}

const order = ['Presidential Diamond', '3-Star Diamond', '2-Star Diamond', '1-Star Diamond'];
for (const k of order) {
  const list = all[k] || [];
  console.log(`\n═══ ${k.toUpperCase()} (${list.length}) ═══`);
  list.forEach((m, i) => {
    console.log(`  ${(i+1).toString().padStart(3)}. ${(m.full_name || '').padEnd(35)} ${(m.amare_id || '').toString().padEnd(9)} ${(m.country || '').padEnd(3)}`);
  });
}
console.log('\nTOPLAM:', Object.values(all).reduce((s, a) => s + a.length, 0));
process.exit(0);
