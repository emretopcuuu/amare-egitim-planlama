// gecYukle — "Importing a module script failed" hatasına karşı koruma.
//
// SORUN: Uygulama Vite ile paketleniyor; her sayfa ayrı bir JS parçası ve
// parçanın adında sürüm damgası var (ör. TakvimView-a1b2c3.js). Yeni sürüm
// yayınlandığında bu ad DEĞİŞİR. Telefonda o an açık duran eski sekme hâlâ
// ESKİ adı istiyor; o dosya artık sunucuda yok → tarayıcı hata veriyor ve
// kullanıcı kırmızı "UI Hatası" ekranını görüyor. (Emre, 12 Ağu.)
//
// ÇÖZÜM: Parça indirilemezse sayfayı BİR KEZ kendiliğinden yenile. Yenilenen
// sayfa yeni index.html'i alır, yeni parça adlarını öğrenir, sorun biter.
// Kullanıcı hiçbir hata görmez.
//
// SONSUZ DÖNGÜ KORUMASI: Yenileme damgası sessionStorage'a yazılır. Aynı
// oturumda 10 saniye içinde ikinci kez yenileme YAPILMAZ — o zaman hata
// gerçekten kalıcıdır (ağ kopuk, dosya bozuk) ve hatayı yukarı fırlatırız ki
// error boundary anlaşılır bir ekran gösterebilsin.

const ANAHTAR = 'ot_parca_yenileme';
const BEKLEME = 10000; // ms — bu süre içinde ikinci yenileme yok

// Tarayıcılar aynı olayı farklı cümlelerle anlatıyor; hepsini yakala.
// Not: MIME cümlesi tarayıcıya göre iki türlü yazılıyor —
//   Chrome:  "Expected a JavaScript module script but the server responded with
//             a MIME type of 'text/html'"   (parça yerine 404 sayfası geldi)
//   Firefox: "…is not a valid JavaScript MIME type"
// İkisini de kapsayacak şekilde "MIME type" ifadesini yakalıyoruz.
const DESEN = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk \d+ failed|Unable to preload CSS|MIME type/i;

/** Hata, "parça indirilemedi" hatası mı? (gerçek kod hatalarından ayır) */
export function parcaHatasiMi(hata) {
  const mesaj = (hata && (hata.message || hata.reason?.message || String(hata))) || '';
  return DESEN.test(mesaj);
}

function damgaOku() {
  try { return Number(sessionStorage.getItem(ANAHTAR) || 0); } catch { return 0; }
}
function damgaYaz(deger) {
  try { sessionStorage.setItem(ANAHTAR, String(deger)); } catch { /* gizli sekme */ }
}

/**
 * Yakın zamanda yenilemediysek sayfayı yeniler ve true döner.
 * Yenilediyse false döner (çağıran hatayı yukarı fırlatmalı).
 */
export function yenilemeyiDene() {
  const simdi = Date.now();
  if (simdi - damgaOku() < BEKLEME) return false;
  damgaYaz(simdi);
  window.location.reload();
  return true;
}

/**
 * lazy(() => import('./X')) yerine lazy(gecYukle(() => import('./X'))).
 * Parça inmezse sayfa bir kez yenilenir; bu sırada Suspense askıda kalır
 * (çözülmeyen promise) ki kullanıcı yenileme öncesi hata ekranı görmesin.
 */
export function gecYukle(fabrika) {
  return () => fabrika().catch((hata) => {
    if (!parcaHatasiMi(hata)) throw hata;
    if (!yenilemeyiDene()) throw hata;
    return new Promise(() => {}); // reload gelene kadar askıda
  });
}

/**
 * Vite, önyüklenen bir parça inmediğinde window'a 'vite:preloadError' atar ve
 * varsayılan davranış hatayı fırlatmaktır. Aynı korumayı oraya da bağla.
 */
export function parcaKorumasiniBaslat() {
  window.addEventListener('vite:preloadError', (e) => {
    if (yenilemeyiDene()) e.preventDefault();
  });
}
