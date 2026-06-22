// Dokunsal geri bildirim: destekleyen cihazlarda kısa titreşim. Hareket-azalt
// tercihinde ve desteklemeyen cihazlarda sessizce hiçbir şey yapmaz.
export function titret(desen: number | number[] = 12) {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const azalt =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!azalt) navigator.vibrate(desen);
  } catch {
    // bazı tarayıcılar vibrate'i güvenlik gerekçesiyle reddedebilir — yok say
  }
}

// Yaşayan su: arka plandaki göl, kullanıcının eylemine halkayla karşılık verir.
// x,y ekran koordinatı (-1..1); verilmezse su yüzeyine denk gelen merkez.
export function suDalgasi(x?: number, y?: number) {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("ayna-su-dalga", { detail: { x, y } }));
  } catch {
    // CustomEvent desteklenmiyorsa sessizce yok say
  }
}

// Kutlama anı: bir başarı (hedef mühürlendi, görev tamamlandı) gerçekleştiğinde
// dokunsal nabız + su dalgası birlikte tetiklenir. Görsel kıvılcım patlaması
// ayrı bileşenle (KivilcimPatlama) yapılır. Hareket-azalt/destek yoksa sessiz.
export function kutla() {
  titret([18, 40, 22]);
  suDalgasi();
}

// Tek seferlik paylaşılan AudioContext (her seste yeni context açmak pahalı
// ve tarayıcı limitlidir). İlk dokunuştan sonra hazır olur.
let _ses: AudioContext | null = null;
function sesBaglami(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!_ses) _ses = new AC();
    if (_ses.state === "suspended") void _ses.resume();
    return _ses;
  } catch {
    return null;
  }
}

// Nazik onay sesi: görev teslimi / kazanım anında kısa, yumuşak iki nota.
// Fiziksel dünyadaki "zil" ritüelinin dijital karşılığı. Hareket-azalt
// tercihinde sessiz kalır (ses de bir uyarandır). Desteklenmiyorsa hiçbir şey
// yapmaz — titret() ile birlikte kullanılır, asla tek başına kritik değildir.
export function cal(tur: "teslim" | "kazanim" = "teslim") {
  try {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ac = sesBaglami();
    if (!ac) return;
    // teslim: tek sıcak nota. kazanim: yükselen iki nota (küçük kutlama).
    const notalar = tur === "kazanim" ? [587.33, 880] : [659.25];
    notalar.forEach((hz, i) => {
      const t0 = ac.currentTime + i * 0.14;
      const osc = ac.createOscillator();
      const kazanc = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = hz;
      kazanc.gain.setValueAtTime(0.0001, t0);
      kazanc.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      kazanc.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(kazanc).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  } catch {
    // Ses politikası / desteklenmeme: sessizce yok say
  }
}
