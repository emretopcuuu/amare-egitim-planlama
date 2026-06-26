"use client";

import { useCallback, useRef } from "react";

// Geliştirme 7 — İdempotency Anahtarları: kritik form gönderimlerinde çift
// tıklama / yeniden deneme duplikasyonunu önler. Her form mount'unda benzersiz
// bir anahtar üretilir; sunucu `X-Idempotency-Key` başlığını kontrol edebilir.
// Başarılı gönderimde anahtar yenilenir — aynı form tekrar gönderilebilir.

export function useIdempotency(): {
  headers: () => Record<string, string>;
  yenile: () => void;
} {
  const anahtarRef = useRef<string>(crypto.randomUUID());

  const headers = useCallback((): Record<string, string> => {
    return { "X-Idempotency-Key": anahtarRef.current };
  }, []);

  const yenile = useCallback(() => {
    anahtarRef.current = crypto.randomUUID();
  }, []);

  return { headers, yenile };
}
