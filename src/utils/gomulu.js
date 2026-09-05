// GÖMÜLÜ MOD — takvim, OneTeam uygulamasının içindeki çerçevede açıldığında.
//
// 🔴 NEDEN VAR (Emre, 12 Ağu, ekran görüntüsüyle): uygulama takvimi bir kutuya
// koyup gösteriyordu ve ekranda İKİ alt çubuk (onun 5 ikonu + uygulamanınki),
// İKİ başlık ve iki ayrı marka rengi üst üste biniyordu. "Milyon dolarlık
// uygulama gibi durmuyor" tespiti buradan geliyordu — sorun çerçeve değil,
// kabuğun İKİ KEZ çizilmesiydi.
//
// Gömülü modda takvim kendi kabuğunu bırakıyor: alt çubuk, üst bar ve giriş
// düğmesi gizleniyor, zemin uygulamanın gece lacivertine dönüyor. Ekranda tek
// başlık, tek alt çubuk, tek marka kalıyor. İçerik aynı içerik.
//
// 🔴 KALICI: bayrak yalnız İLK adreste geliyor (?gomulu=1) ama uygulama tek
// sayfa — kişi takvimden eğitim detayına geçince adres değişiyor ve bayrak
// düşerdi. Ayrıca giriş köprüsü /sso üzerinden /takvim'e yönlendiriyor, o da
// adresi değiştiriyor. Bu yüzden bayrak sekme belleğine yazılıyor: sekme
// açık kaldığı sürece geçerli, sekme kapanınca kendiliğinden unutuluyor.
//
// Normal tarayıcıda (uygulamasız) hiçbir şey değişmez — bayrak yoksa mod kapalı.

const ANAHTAR = 'ot_gomulu';

/** Uygulama çerçevesinin içinde miyiz? */
export function gomuluMu() {
  try {
    return sessionStorage.getItem(ANAHTAR) === '1';
  } catch {
    // Gizli sekmede sessionStorage yazılamayabiliyor — o zaman adrese bakıyoruz.
    return new URLSearchParams(window.location.search).get('gomulu') === '1';
  }
}

/**
 * React yüklenmeden ÖNCE çalışır (main.jsx'in ilk satırı).
 * Bayrağı <html data-gomulu="1"> olarak basar; böylece CSS ilk boyamada
 * devrede olur ve kullanıcı mor kabuğun bir kare görünüp kaybolduğunu görmez.
 */
export function gomuluBaslat() {
  let acik = false;
  try {
    const p = new URLSearchParams(window.location.search).get('gomulu');
    if (p === '1') { sessionStorage.setItem(ANAHTAR, '1'); acik = true; }
    else if (p === '0') { sessionStorage.removeItem(ANAHTAR); acik = false; }
    else acik = sessionStorage.getItem(ANAHTAR) === '1';
  } catch {
    acik = new URLSearchParams(window.location.search).get('gomulu') === '1';
  }
  if (acik) document.documentElement.setAttribute('data-gomulu', '1');
  else document.documentElement.removeAttribute('data-gomulu');
  return acik;
}
