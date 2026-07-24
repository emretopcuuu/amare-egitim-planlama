"use client";

// Çerezsiz, kişisel-veri-siz olay ölçümü. sendBeacon ile tek atış; uç nokta
// (Cloudflare Pages Function /api/olay) yoksa sessizce başarısız olur.
// Yalnız olay ADI gönderilir — kim/nereden bilgisi yok.
export function olcum(olay: string) {
  try {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const govde = new Blob([JSON.stringify({ o: olay })], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/olay", govde);
  } catch {
    /* yoksay */
  }
}
