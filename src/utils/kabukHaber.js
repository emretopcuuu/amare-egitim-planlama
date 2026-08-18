/* ── KABUĞA OTURUM HABERİ (18 Ağu 2026) ────────────────────────────────────
   Emre: "Her seferinde bu 'giriş yapılıyor' mesajları geliyor açtığımda.
   Arka tarafta bunu zaten otomatik yapamıyor mu? Bir kere yapınca yetmiyor mu?"

   Haklıydı. Uygulama takvimi HER açışta /sso'dan geçiriyordu: sunucudan taze
   bir Firebase custom token alınıyor, çerçeveye o adres konuyor, SsoCallback
   açılıyor ve "zaten girişli mi" diye Firebase'in oturumu diskten geri
   yüklemesini 1,5 saniyeye kadar bekliyor. Oturum ZATEN AÇIKKEN bile o mor
   kart ekranda duruyor.

   Doğrusu: oturum açıksa /sso'ya hiç uğramadan doğrudan /takvim. Ama
   uygulama bunu KENDİ BAŞINA BİLEMEZ — ayrı alan adı, ayrı kimlik sistemi,
   çerezleri okuyamıyor. Bilen taraf biziz; söylemek de bize düşüyor.

   🔴 SESSİZ BAŞARISIZLIK TEHLİKESİ, bu dosyanın asıl varlık sebebi:
   /takvim'de giriş duvarı YOK. Oturum bulunamazsa AuthContext sessizce
   ANONİM giriş yapıyor ve takvim açılıyor — ama kişinin kayıtları, ekibi,
   profili görünmüyor. Yani uygulamanın tahmini yanlış olduğunda ekran
   "bozuk" görünmez, yalnızca EKSİK görünür; kimse hata bildirmez. Bu yüzden
   haber ÇİFT YÖNLÜ: girişliyken de girişsizken de söylüyoruz, uygulama da
   girişsiz haberini alınca köprüyü kurup çerçeveyi tazeliyor.

   🔴 DAĞITIM SIRASI KENDİLİĞİNDEN GÜVENLİ: uygulama kısayolu ancak
   "girişliyim" haberini ALDIKTAN sonra kullanıyor ve bu haberi yalnız bu
   dosyayı taşıyan sürüm gönderebiliyor. Yani takvim güncellenmeden uygulama
   kısayola geçemez — iki deploy arasında bozuk bir pencere oluşmuyor.

   Hedef köken EL SIKIŞMADAN öğreniliyor: uygulama çerçeve yüklenince veri
   taşımayan bir "ot-merhaba" gönderiyor, biz de hedefi o mesajın kökeninden
   alıyoruz. referrer'dan türetmek İŞE YARAMIYOR — sayfa bayrağı adresten
   temizlemek için kendini yeniden yüklüyor ve referrer o andan sonra ebeveyn
   değil, sayfanın kendi adresi oluyor (HBB tarafında ölçüldü). Hedef
   bilinmeden '*' ile yayın yapmıyoruz: bu sayfayı gömen herkese oturum
   durumu duyurmak olurdu.
   ────────────────────────────────────────────────────────────────────────── */
import { gomuluMu } from './gomulu';

let hedef = '';
let bekleyen = null;   // selam gelmeden söylenmek istenen son durum
let kuruldu = false;

function dinleyiciyiKur() {
  if (kuruldu) return;
  kuruldu = true;
  window.addEventListener('message', (ev) => {
    if (ev.source !== window.parent) return;        // yalnız bizi gömen pencere
    if (!ev.data || ev.data.ot !== 'ot-merhaba') return;
    hedef = ev.origin;
    if (bekleyen) { const t = bekleyen; bekleyen = null; gonder(t); }
  });
}

function gonder(tip) {
  if (!hedef) { bekleyen = tip; return; }           // selam gelince yollanır
  try { window.parent.postMessage({ ot: tip }, hedef); } catch { /* sessiz */ }
}

/**
 * Uygulamaya oturum durumunu bildirir. Yalnız gömülü modda çalışır; normal
 * tarayıcıda dinleyici bile kurulmaz.
 * @param {boolean} girisli gerçek (anonim olmayan, e-postalı) kullanıcı var mı
 */
export function oturumuBildir(girisli) {
  if (!gomuluMu()) return;
  dinleyiciyiKur();
  gonder(girisli ? 'takvim-girisli' : 'takvim-girissiz');
}
