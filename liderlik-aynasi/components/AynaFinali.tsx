"use client";

import { useEffect, useState } from "react";
import MuhurAcilis from "@/components/MuhurAcilis";
import MezuniyetKutlama from "@/components/MezuniyetKutlama";

// Mühür açılışı (kutsal reveal) ile keeps aynı localStorage anahtarı — reveal
// daha önce görülmüşse tekrar açılmaz, o durumda mezuniyet doğrudan gelir.
const MUHUR_ANAHTAR = "la_muhur_v1";

// AYNA RAPORU FİNALİ — önce Mühür Açılışı (kendi sesin + adlandırma), o kapanınca
// KAMP BİTİŞ (mezuniyet) kutlaması. Reveal hiç açılmayacaksa (mühür kapalı ya da
// daha önce görüldü) mezuniyet doğrudan patlar. Böylece iki full-screen an
// çakışmaz; doruk (reveal) önce, kutlama sonra.
export default function AynaFinali(props: {
  aktif: boolean;
  sesUrl: string | null;
  beklenti: string | null;
  gelis: string;
  donus: string;
  ayni: boolean;
}) {
  const [muhurBitti, setMuhurBitti] = useState(false);

  useEffect(() => {
    // Reveal gösterilmeyecekse mezuniyeti hemen aç.
    if (!props.aktif) {
      setMuhurBitti(true);
      return;
    }
    try {
      if (localStorage.getItem(MUHUR_ANAHTAR)) setMuhurBitti(true);
    } catch {
      /* localStorage yoksa reveal'in onKapat'ını bekleriz */
    }
  }, [props.aktif]);

  return (
    <>
      <MuhurAcilis {...props} onKapat={() => setMuhurBitti(true)} />
      {muhurBitti && <MezuniyetKutlama anahtar="ayna-rapor" />}
    </>
  );
}
