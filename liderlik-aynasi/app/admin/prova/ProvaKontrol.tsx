"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Bekle from "@/components/Bekle";

type Props = {
  baslangicAktif: boolean;
  baslangicGun: number;
  katilimciSayisi: number;
};

const GUN_AD = ["", "Gün 1 — Cuma", "Gün 2 — Cumartesi", "Gün 3 — Pazar"];

function sanalSaatYazi(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ProvaKontrol({
  baslangicAktif,
  baslangicGun,
  katilimciSayisi,
}: Props) {
  const router = useRouter();
  const [aktif, setAktif] = useState(baslangicAktif);
  const [gun, setGun] = useState(baslangicGun);
  const [sanal, setSanal] = useState<string | null>(null);
  const [bekle, setBekle] = useState<string | null>(null);
  const [son, setSon] = useState<string | null>(null);
  const iptalRef = useRef(false);

  const tik = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/prova", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eylem: "tik" }),
      });
      const d = await res.json().catch(() => null);
      if (iptalRef.current || !d?.ok) return;
      setSanal(d.sanal);
      setGun(d.gun);
      const s = d.sonuc ?? {};
      const parcalar = [
        s.uretilen ? `${s.uretilen} görev` : null,
        s.puanlanan ? `${s.puanlanan} puanlama` : null,
        s.senkron ? `senkron an` : null,
        s.fisilti ? `${s.fisilti} fısıltı` : null,
        s.acilan ? `${s.acilan} duyuru` : null,
      ].filter(Boolean);
      setSon(parcalar.length ? parcalar.join(" · ") : "sakin geçti");
    } catch {
      /* poll: geçici hata, sonraki tur dener */
    }
  }, []);

  // Otomatik tik döngüsü: prova aktifken her 15 sn bir AYNA turu çalıştır.
  useEffect(() => {
    if (!aktif) return;
    iptalRef.current = false;
    void tik();
    const id = setInterval(() => void tik(), 15_000);
    return () => {
      iptalRef.current = true;
      clearInterval(id);
    };
  }, [aktif, gun, tik]);

  async function eylem(e: "baslat" | "gunGec" | "bitir", onayMetni?: string) {
    if (onayMetni && !window.confirm(onayMetni)) return;
    setBekle(e);
    try {
      const res = await fetch("/api/admin/prova", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eylem: e }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.ok) return;
      if (e === "baslat") {
        setGun(1);
        setSanal(null);
        setSon(null);
        setAktif(true);
      } else if (e === "gunGec") {
        setGun(d.gun);
        setSanal(null);
        setSon(null);
      } else if (e === "bitir") {
        setAktif(false);
      }
      router.refresh();
    } finally {
      setBekle(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Durum şeridi */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1.5 font-semibold ring-1 ${
            aktif
              ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
              : "bg-midnight-card/60 text-slate-400 ring-royal/20"
          }`}
        >
          {aktif ? "● Prova sürüyor" : "○ Prova kapalı"}
        </span>
        {aktif && (
          <>
            <span className="rounded-full bg-royal/20 px-3 py-1.5 font-medium text-gold-light ring-1 ring-royal/30">
              {GUN_AD[gun] ?? `Gün ${gun}`}
            </span>
            <span className="rounded-full bg-midnight-card/60 px-3 py-1.5 font-mono text-slate-300 ring-1 ring-royal/20">
              🕐 Sanal saat: {sanalSaatYazi(sanal)}
            </span>
          </>
        )}
        <span className="rounded-full bg-midnight-card/60 px-3 py-1.5 text-slate-400 ring-1 ring-royal/20">
          👤 {katilimciSayisi} kişi
        </span>
      </div>

      {aktif && son && (
        <p className="text-sm text-emerald-400">Son tur: {son}</p>
      )}

      {/* Eylemler */}
      {!aktif ? (
        <button
          onClick={() =>
            eylem(
              "baslat",
              `Prova kampını başlat?\n\nGün 1'den itibaren ${katilimciSayisi} kişiye gerçek görev/ses/bildirim gitmeye başlayacak (hızlandırılmış). Devam?`
            )
          }
          disabled={bekle !== null}
          className="rounded-xl bg-gold px-6 py-3 font-bold text-[#1a1206] shadow-lg shadow-gold/20 transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {bekle === "baslat" ? <Bekle /> : "▶ Prova Kampını Başlat (Gün 1)"}
        </button>
      ) : (
        <div className="flex flex-wrap gap-3">
          {gun < 3 ? (
            <button
              onClick={() =>
                eylem(
                  "gunGec",
                  `${GUN_AD[gun]} bitti, ${GUN_AD[gun + 1]}'e geçilsin mi?`
                )
              }
              disabled={bekle !== null}
              className="rounded-lg bg-royal/50 px-5 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:bg-royal/70 disabled:opacity-50"
            >
              {bekle === "gunGec" ? <Bekle /> : `⏭ Sonraki Güne Geç (${GUN_AD[gun + 1]})`}
            </button>
          ) : (
            <span className="rounded-lg border border-gold/40 px-5 py-2.5 text-sm text-gold-light">
              Son gündesin — kapanışa hazır
            </span>
          )}
          <button
            onClick={() => eylem("bitir", "Provayı bitir? Sanal saat kapanır, sistem gerçek zamana döner.")}
            disabled={bekle !== null}
            className="rounded-lg border border-royal-light/40 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-soft disabled:opacity-50"
          >
            {bekle === "bitir" ? <Bekle /> : "■ Provayı Bitir"}
          </button>
        </div>
      )}
    </div>
  );
}
