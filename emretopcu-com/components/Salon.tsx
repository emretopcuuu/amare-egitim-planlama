"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "motion/react";
import { ArrowsOut } from "@phosphor-icons/react";
import { ICERIK, WHATSAPP_NUMARA, WHATSAPP_MESAJ } from "@/lib/icerik";

// Sahne modu: perdeye yansıtılacak tam ekran döngü. Söz + WhatsApp QR.
// Konuşma bitiminde "telefonunuzu çıkarın" anı için. Her zaman gece görünümü.
const SOZLER = ICERIK.tr.sozler;
const SALON_URL = `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(
  `${WHATSAPP_MESAJ} [salon]`,
)}`;

export default function Salon() {
  const [i, setI] = useState(0);
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(SALON_URL, {
      margin: 1,
      width: 320,
      color: { dark: "#0f1220", light: "#f1eee6" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SOZLER.length), 8000);
    return () => clearInterval(t);
  }, []);

  const tamEkran = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const s = useMemo(() => SOZLER[i], [i]);

  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-8 text-center"
      style={{ background: "#0f1220", color: "#f1eee6" }}
    >
      <button
        type="button"
        onClick={tamEkran}
        aria-label="Tam ekran"
        className="absolute top-6 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8b45a]/40 text-[#d8b45a] transition-colors hover:bg-[#d8b45a] hover:text-[#0f1220]"
      >
        <ArrowsOut size={20} weight="bold" />
      </button>

      <p
        className="mb-12 text-sm font-medium tracking-[0.3em] uppercase"
        style={{ color: "#d8b45a" }}
      >
        Emre Topçu
      </p>

      <div className="flex min-h-[42vh] max-w-[22ch] items-center">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-lux text-4xl leading-[1.12] font-semibold tracking-tight md:text-7xl"
          >
            <span style={{ color: "rgba(216,180,90,0.5)" }}>“</span>
            {s.soz}
            <span style={{ color: "rgba(216,180,90,0.5)" }}>”</span>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="mt-16 flex flex-col items-center gap-4">
        {qr && (
          <img
            src={qr}
            alt="WhatsApp QR"
            className="h-32 w-32 rounded-xl md:h-40 md:w-40"
          />
        )}
        <p className="text-lg" style={{ color: "#9d9a92" }}>
          Telefonunu çıkar, karnını okut — birlikte başlayalım.
        </p>
        <p className="text-sm tracking-[0.15em]" style={{ color: "#d8b45a" }}>
          emretopcu.ai
        </p>
      </div>
    </main>
  );
}
