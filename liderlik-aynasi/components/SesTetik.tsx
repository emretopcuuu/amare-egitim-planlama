"use client";

import { useEffect } from "react";
import { sesCal, type SesAdi } from "@/lib/sesEfekti";

// Mount olunca bir kez ses efekti çalar (server bileşenlerine gömülebilen
// görünmez client tetikleyici). Ses aç/kapa + soğuma koruması sesEfekti'nde.
export default function SesTetik({ ses }: { ses: SesAdi }) {
  useEffect(() => {
    sesCal(ses);
  }, [ses]);
  return null;
}
