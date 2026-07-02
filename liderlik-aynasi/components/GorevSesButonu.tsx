"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// "AYNA'dan dinle" — görevi GERÇEK AYNA sesiyle (ElevenLabs, kişinin seçtiği
// erkek/kadın) okutur. Metin sunucuda okunur (/api/gorev-ses?id), üretilen mp3
// depoya önbelleklenir. ElevenLabs kapalıysa ya da üretim düşerse tarayıcının
// kendi TTS'ine (robot) düşer — böylece hiçbir görev sessiz kalmaz ama varsayılan
// artık robot değil, gerçek AYNA sesidir.
export default function GorevSesButonu({ gorevId, metin }: { gorevId: string; metin: string }) {
  const [durum, setDurum] = useState<"bos" | "yukleniyor" | "caliyor">("bos");
  const [robotDestek, setRobotDestek] = useState(false);
  const sesRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setRobotDestek(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      sesRef.current?.pause();
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  function robotOku() {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = "tr-TR";
      u.rate = 0.96;
      u.pitch = 0.95;
      const trSes = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
      if (trSes) u.voice = trSes;
      u.onend = () => setDurum("bos");
      u.onerror = () => setDurum("bos");
      setDurum("caliyor");
      s.speak(u);
    } catch {
      setDurum("bos");
    }
  }

  function gercekCal(url: string) {
    if (!sesRef.current) {
      sesRef.current = new Audio(url);
      sesRef.current.onended = () => setDurum("bos");
      sesRef.current.onerror = () => setDurum("bos");
    }
    void sesRef.current
      .play()
      .then(() => setDurum("caliyor"))
      .catch(() => setDurum("bos"));
  }

  async function tikla() {
    titret(10);
    // Çalıyorsa durdur (hem gerçek ses hem robot).
    if (durum === "caliyor") {
      sesRef.current?.pause();
      if (sesRef.current) sesRef.current.currentTime = 0;
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setDurum("bos");
      return;
    }
    if (durum === "yukleniyor") return;

    // Gerçek ses daha önce alındıysa doğrudan çal.
    if (urlRef.current) {
      gercekCal(urlRef.current);
      return;
    }

    setDurum("yukleniyor");
    try {
      const r = await fetch(`/api/gorev-ses?id=${encodeURIComponent(gorevId)}`);
      const veri = (await r.json().catch(() => null)) as { url?: string } | null;
      if (r.ok && veri?.url) {
        urlRef.current = veri.url;
        gercekCal(veri.url);
        return;
      }
    } catch {
      // ağ/sunucu hatası — robota düş
    }
    // ElevenLabs kapalı/başarısız → tarayıcı TTS (robot) son çare.
    if (robotDestek) robotOku();
    else setDurum("bos");
  }

  // Gerçek ses de yoksa robot da yoksa buton hiç görünmesin (sessiz düşüş).
  if (!robotDestek && durum === "bos" && !urlRef.current) {
    // Yine de gerçek ses denenebilir; butonu göster (fetch şansı için).
  }

  return (
    <button
      type="button"
      onClick={tikla}
      aria-pressed={durum === "caliyor"}
      disabled={durum === "yukleniyor"}
      className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60 ${
        durum === "caliyor"
          ? "border-gold/50 bg-gold/15 text-gold-light"
          : "border-white/15 text-slate-200 hover:bg-white/[0.06]"
      }`}
    >
      {durum === "caliyor" ? t.durdur : durum === "yukleniyor" ? `⏳ ${t.dinle}` : `🔊 ${t.dinle}`}
    </button>
  );
}
