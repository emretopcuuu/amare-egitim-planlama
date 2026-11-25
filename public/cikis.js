// cikis.js — One Team UYGULAMASINDAN ÇIKIŞTA takvimin oturumunu kapatır (25 Kas 2026).
// NEDEN: takvim uygulamada çerçevede açılır ve Firebase oturumunu bu kökenin tarayıcı veritabanında (IndexedDB
// "firebaseLocalStorageDb") tutar. Uygulamadan çıkış yalnız uygulamanın oturumunu siliyordu; aynı telefona başka biri
// girince takvim önceki kişinin hesabıyla açılıyordu. Uygulama ("Çıkış yap", lib/ayar.js aracCikis) bu sayfayı görünmez
// çerçevede açar; sayfa:
//   ① Firebase oturum deposunun İÇİNİ boşaltır (açık bir takvim çerçevesi veritabanını tutuyor olsa da çalışır)
//   ② firebase / firestore veritabanlarını silmeyi ister (açık bağlantı yoksa hemen silinir)
//   ③ bu kökenin localStorage + sessionStorage'ını siler (önceki kişinin önbelleği)
//   ④ uygulamaya "bitti" der (uygulama en çok 3,5 sn bekler).
// Kaynak eşi: OneTeamAI-Automation cloudflare/_ortak/cikis.js (oradaki altı site aynı düzeni kullanır).
(function () {
  var UYGULAMA = 'https://app.oneteamglobal.ai';
  var idb = window.indexedDB;
  function depoyuBosalt() {
    return new Promise(function (bitir) {
      if (!idb) return bitir();
      var acik;
      try { acik = idb.open('firebaseLocalStorageDb'); } catch (e) { return bitir(); }
      acik.onerror = function () { bitir(); };
      acik.onupgradeneeded = function () { try { acik.transaction.abort(); } catch (e) {} };
      acik.onsuccess = function () {
        var db = acik.result;
        try {
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return bitir(); }
          var tx = db.transaction('firebaseLocalStorage', 'readwrite');
          tx.objectStore('firebaseLocalStorage').clear();
          tx.oncomplete = tx.onerror = tx.onabort = function () { try { db.close(); } catch (e) {} bitir(); };
        } catch (e) { try { db.close(); } catch (e2) {} bitir(); }
      };
    });
  }
  function veritabanlariniSil() {
    if (!idb) return Promise.resolve();
    var adlar = idb.databases ? idb.databases().then(function (l) { return (l || []).map(function (d) { return d && d.name; }); }).catch(function () { return []; }) : Promise.resolve([]);
    return adlar.then(function (l) {
      if (l.indexOf('firebaseLocalStorageDb') < 0) l.push('firebaseLocalStorageDb');
      l.filter(function (ad) { return ad && /^(firebase|firestore)/i.test(ad); }).forEach(function (ad) {
        try { idb.deleteDatabase(ad); } catch (e) {}   // açık bağlantı varsa "blocked" kalır, bağlantı kapanınca tamamlanır
      });
    });
  }
  function depolar() {
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
  }
  function bitti() {
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ t: 'ot-cikis-tamam', site: location.hostname }, UYGULAMA); } catch (e) {}
  }
  var oldu = false;
  function son() { if (oldu) return; oldu = true; depolar(); bitti(); }   // tek kez: uygulama her siteden bir 'bitti' sayar
  setTimeout(son, 2500);
  depoyuBosalt().then(veritabanlariniSil).catch(function () {}).then(son);
})();
