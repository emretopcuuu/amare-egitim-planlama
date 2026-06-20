"use client";

import { useEffect, useRef, useState } from "react";

const LENGTH = 6;
// Güçlü ease-out (yerleşik easing'ler fazla zayıf): dingin ama kararlı his.
const YUMUSAK = "cubic-bezier(0.23, 1, 0.32, 1)";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
};

// 6 kutulu sayısal kod girişi. Gerçek <input>'ler korunur (erişilebilirlik,
// klavye, yapıştırma); görsel davranış WAAPI ile zenginleşir (GPU, kütüphanesiz):
// aktif kutu büyür + amber halka + özel yanıp sönen imleç; rakam girince pop +
// amber glow nabzı. Hareket-azalt tercihinde hareketler atlanır.
export default function CodeInput({ value, onChange, onComplete, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [odak, setOdak] = useState<number | null>(null);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === LENGTH) onComplete?.(value);
    // onComplete bilinçli olarak bağımlılık dışı: yalnızca değer tamamlanınca tetiklenmeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function azalt() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
  }

  // Rakam girince: kısa pop (scale) + amber glow nabzı. Tek atış, GPU, kesintiye
  // dayanıklı. Kutu o an odağı kaybediyor (odak sıradakine geçti), bu yüzden
  // 1.05 → 1.16 → 1 ile yumuşakça yerine oturur.
  function pop(i: number) {
    if (azalt()) return;
    const el = refs.current[i];
    if (!el?.animate) return;
    const inset = "inset 0 2px 8px rgba(0,0,0,0.35)";
    el.animate(
      [
        { transform: "scale(1.05)", boxShadow: `0 0 0 0 rgba(224,164,88,0), ${inset}` },
        {
          transform: "scale(1.16)",
          boxShadow: `0 0 0 6px rgba(224,164,88,0.35), ${inset}`,
          offset: 0.4,
        },
        { transform: "scale(1)", boxShadow: `0 0 0 0 rgba(224,164,88,0), ${inset}` },
      ],
      { duration: 320, easing: YUMUSAK }
    );
  }

  function setAt(index: number, digit: string) {
    const next = (value.slice(0, index) + digit + value.slice(index + 1)).slice(0, LENGTH);
    onChange(next);
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return;
    if (cleaned.length > 1) {
      // yapıştırma: tamamını baştan dağıt
      const kod = cleaned.slice(0, LENGTH);
      onChange(kod);
      refs.current[Math.min(kod.length, LENGTH) - 1]?.focus();
      // dolan haneleri hafif gecikmeyle sırayla poplat (sakin kademe)
      if (!azalt()) kod.split("").forEach((_, i) => setTimeout(() => pop(i), i * 45));
      return;
    }
    setAt(index, cleaned);
    // Önce odağı sıradakine taşı, sonra bu kutuyu poplat (jump'ı önler).
    refs.current[index + 1]?.focus();
    pop(index);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      onChange(value.slice(0, index - 1));
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" dir="ltr">
      {digits.map((digit, i) => {
        const aktif = odak === i;
        return (
          <div key={i} className="relative">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => {
                setOdak(i);
                e.target.select();
              }}
              onBlur={() => setOdak((o) => (o === i ? null : o))}
              aria-label={`Kod hanesi ${i + 1}`}
              className={`h-14 w-12 caret-transparent rounded-2xl border bg-white/[0.06] text-center text-2xl font-semibold text-slate-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] outline-none transition-[transform,border-color,box-shadow] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)] focus:scale-105 focus:border-[#E0A458] focus:shadow-[0_0_0_4px_rgba(224,164,88,0.28),inset_0_2px_8px_rgba(0,0,0,0.35)] disabled:opacity-50 sm:h-16 sm:w-14 ${
                digit ? "border-[#C8893A]/70" : "border-white/15"
              }`}
            />
            {/* Aktif + boş hanede özel yanıp sönen imleç (native caret gizli) */}
            {aktif && !digit && (
              <span
                aria-hidden
                className="kod-imlec pointer-events-none absolute left-1/2 top-1/2 h-7 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E0A458]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
