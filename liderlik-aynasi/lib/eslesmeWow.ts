import "server-only";

// FAZ 3 — EŞLEŞME WOW KATMANI. Statik/templated metin üreticileri (kanitGarantisi.ts
// deseniyle tutarlı — ucuz, güvenilir, ton kaçmaz). Tetikleme + DB yazma lib/tik.ts'te.

// [3.1] ÇİFT TARAFLI ASİMETRİK GİZLİ GÖREV — A isimli bir bag görevi aldığında,
// hedef kişiye (B) EŞ ZAMANLI, gizli bir "beklenmedik soru" görevi verilir.
// İkisi de diğerinin görevde olduğunu bilmez; ikisi de teslim edince
// /api/gorev-yanit reveal'i tetikler (baglanti_id ile bağlı).
export function gizliEsGorevMetni(): { title: string; body: string } {
  return {
    title: "Beklenmedik bir soru geliyor",
    body: "Birazdan biri sana beklenmedik bir soru soracak. Ne olduğunu bilmiyorsun — ama ne sorulursa sorulsun, tamamen dürüst cevap ver. Cevabını verdikten sonra ne hissettiğini tek cümleyle bana yaz.",
  };
}

// [3.3] TANIK GÖREVİ — A'ya cesaret görevi düştüğünde, aynı mekândaki B'ye
// eşzamanlı "uzaktan izle" görevi verilir. B'nin cevabı kanit_gorevi üzerinden
// A'ya anonim takdir olarak akar (mevcut /api/gorev-yanit "gozlem" akışı).
export function tanikGoreviMetni(aAd: string): { title: string; body: string } {
  return {
    title: `${aAd}'i uzaktan izle`,
    body: `Önümüzdeki saat içinde **${aAd}** bir eşiği geçecek — bir cesaret anı yaşayacak. Onu fark ettirmeden izle. Gördüğün AN'ı, o anı gerçek kılan tek cümleyi bana yaz.`,
  };
}

// [3.4] ÜÇLÜ MİNİ-KONSEY — A'nın gerçek gündemi üzerinden 3 kişilik bir
// buluşma: A dert sahibi, B o konuda dış puanı en yüksek (Johari gizli gücü),
// C tamamlayıcı persona. Üçüne de aynı buluşma bilgisiyle isimli görev.
export function miniKonseyMetinleri(
  aAd: string,
  bAd: string,
  cAd: string,
  konu: string
): { aBody: string; bBody: string; cBody: string } {
  const kural = "Tek kural: yalnız kendi yaşadığını anlat, akıl verme.";
  return {
    aBody: `${bAd} ve ${cAd} ile 10 dakikalığına bir araya gel — konu: ${konu}. ${kural} Konuşmanın sonunda aklında kalan tek cümleyi bana yaz.`,
    bBody: `${aAd}, "${konu}" konusunda seninle konuşmak istiyor. ${cAd} de yanınızda olacak. 10 dakikanızı ayırın. ${kural} Konuşmanın sonunda aklında kalan tek cümleyi bana yaz.`,
    cBody: `${aAd} ve ${bAd}, "${konu}" konusunda bir araya geliyor — sen de bu konseyin bir parçasısın. 10 dakikanızı ayırın. ${kural} Konuşmanın sonunda aklında kalan tek cümleyi bana yaz.`,
  };
}
