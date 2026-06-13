#!/usr/bin/env node
// İLK 5 DAKİKA YÜK PROVASI (#4)
// Kayıt anında 100 kişi aynı anda giriş yapınca sistem ayakta kalıyor mu?
// Bu script, /api/giris uç noktasına N eşzamanlı giriş isteği atar ve
// başarı oranı + gecikme dağılımını raporlar. Canlı veriyi değiştirmez
// (yalnız giriş denemesi yapar; başarısız denemeler rate-limit'e takılabilir).
//
// Kullanım:
//   node scripts/yuk-provasi.mjs <BASE_URL> <KOD1,KOD2,...> [eszamanli=100] [tur=1]
//
// Örnek (prova demo kodlarıyla):
//   node scripts/yuk-provasi.mjs https://liderlik-aynasi.vercel.app 123456,234567 100 3
//
// İpucu: Admin > Prova panelinden birkaç demo katılımcı oluşturup kodlarını
// buraya ver. Rate-limit'e takılmamak için gerçek, geçerli kodlar kullan.

const [, , tabanUrl, kodlarArg, eszamanliArg, turArg] = process.argv;

if (!tabanUrl || !kodlarArg) {
  console.error(
    "Kullanım: node scripts/yuk-provasi.mjs <BASE_URL> <KOD1,KOD2,...> [eszamanli=100] [tur=1]"
  );
  process.exit(1);
}

const kodlar = kodlarArg.split(",").map((k) => k.trim()).filter(Boolean);
const eszamanli = Number(eszamanliArg ?? 100);
const turSayisi = Number(turArg ?? 1);
const url = `${tabanUrl.replace(/\/$/, "")}/api/giris`;

async function birIstek(kod) {
  const bas = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kod }),
    });
    return { ok: res.ok, durum: res.status, sure: performance.now() - bas };
  } catch (e) {
    return { ok: false, durum: 0, sure: performance.now() - bas, hata: String(e) };
  }
}

function yuzdelik(sirali, p) {
  if (sirali.length === 0) return 0;
  const i = Math.min(sirali.length - 1, Math.floor((p / 100) * sirali.length));
  return Math.round(sirali[i]);
}

async function main() {
  console.log(
    `Yük provası → ${url}\n  ${eszamanli} eşzamanlı × ${turSayisi} tur = ${
      eszamanli * turSayisi
    } istek\n`
  );
  const tumSonuc = [];
  for (let tur = 1; tur <= turSayisi; tur++) {
    const baslangic = performance.now();
    const istekler = Array.from({ length: eszamanli }, (_, i) =>
      birIstek(kodlar[i % kodlar.length])
    );
    const sonuclar = await Promise.all(istekler);
    tumSonuc.push(...sonuclar);
    const gecen = performance.now() - baslangic;
    const basarili = sonuclar.filter((s) => s.ok).length;
    console.log(
      `Tur ${tur}: ${basarili}/${eszamanli} başarılı · ${Math.round(gecen)}ms toplam`
    );
  }

  const sureler = tumSonuc.map((s) => s.sure).sort((a, b) => a - b);
  const basarili = tumSonuc.filter((s) => s.ok).length;
  const durumlar = {};
  for (const s of tumSonuc) durumlar[s.durum] = (durumlar[s.durum] ?? 0) + 1;

  console.log("\n=== ÖZET ===");
  console.log(`Toplam istek : ${tumSonuc.length}`);
  console.log(
    `Başarılı     : ${basarili} (%${Math.round((basarili / tumSonuc.length) * 100)})`
  );
  console.log(`HTTP durumlar: ${JSON.stringify(durumlar)}`);
  console.log(
    `Gecikme (ms) : p50=${yuzdelik(sureler, 50)} · p95=${yuzdelik(
      sureler,
      95
    )} · p99=${yuzdelik(sureler, 99)} · max=${Math.round(sureler.at(-1) ?? 0)}`
  );
  console.log(
    "\nNot: 429 (çok fazla deneme) görmek normaldir — rate-limit çalışıyor demektir."
  );
}

main();
