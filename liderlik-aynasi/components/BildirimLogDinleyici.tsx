"use client";

import { useBildirimLog } from "@/lib/useBildirimLog";

// Layout'ta bir kez monte edilir; SW'den gelen push mesajlarını localStorage'a kaydeder.
export default function BildirimLogDinleyici() {
  useBildirimLog();
  return null;
}
