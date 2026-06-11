"use client";

import { useEffect, useRef } from "react";

const LENGTH = 6;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
};

// 6 kutulu sayısal kod girişi: otomatik ilerleme, yapıştırma desteği,
// tablet kiosk için büyük dokunma hedefleri.
export default function CodeInput({ value, onChange, onComplete, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === LENGTH) onComplete?.(value);
    // onComplete bilinçli olarak bağımlılık dışı: yalnızca değer tamamlanınca tetiklenmeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function setAt(index: number, digit: string) {
    const next = (value.slice(0, index) + digit + value.slice(index + 1)).slice(
      0,
      LENGTH
    );
    onChange(next);
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return;
    if (cleaned.length > 1) {
      // yapıştırma: tamamını baştan dağıt
      onChange(cleaned.slice(0, LENGTH));
      refs.current[Math.min(cleaned.length, LENGTH) - 1]?.focus();
      return;
    }
    setAt(index, cleaned);
    refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      onChange(value.slice(0, index - 1));
    }
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {digits.map((digit, i) => (
        <input
          key={i}
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
          onFocus={(e) => e.target.select()}
          aria-label={`Kod hanesi ${i + 1}`}
          className="h-14 w-11 rounded-xl border-2 border-royal-light/40 bg-midnight-soft text-center text-2xl font-bold text-gold-light outline-none transition-all focus:border-gold focus:shadow-[0_0_0_4px_rgba(212,175,55,0.15)] disabled:opacity-50 sm:h-16 sm:w-12"
        />
      ))}
    </div>
  );
}
