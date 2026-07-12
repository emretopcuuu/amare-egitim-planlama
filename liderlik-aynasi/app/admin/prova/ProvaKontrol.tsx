"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Bekle from "@/components/Bekle";

type Props = {
  baslangicAktif: boolean;
  baslangicGun: number;
  katilimciSayisi: number;
  // GÜVENLİK KİLİDİ: prova tek katılımcıya sabitlenir (bkz. lib/prova.ts).
  baslangicKatilimciId: string | null;
  baslangicKatilimciAd: string | null;
};

type AramaSonucu = { id: string; full_name: string; team: string | null };

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
  baslangicKatilimciId,
  baslangicKatilimciAd,
}: Props) {
  const router = useRouter();
  const [aktif, setAktif] = useState(baslangicAktif);
  const [gun, setGun] = useState(baslangicGun);
  const [sanal, setSanal] = useState<string | null>(null);
  const [bekle, setBekle] = useState<string | null>(null);
  const [son, setSon] = useState<string | null>(null);
  const iptalRef = useRef(false);

  // GÜVENLİK KİLİDİ: prova başlamadan önce TEK katılımcı seçilmeli.
  const [secilenId, setSecilenId] = useState<string | null>(baslangicKatilimciId);
  const [secilenAd, setSecilenAd] = useState<string | null>(baslangicKatilimciAd);
  const [arama, setArama] = useState("");
  const [aramaSonuc, setAramaSonuc] = useState<AramaSonucu[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const aramaZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  function aramaDegisti(deger: string) {
    setArama(deger);
    setAramaSonuc([]);
    if (aramaZamanlayici.current) clearTimeout(aramaZamanlayici.current);
    if (deger.trim().length < 2) return;
    aramaZamanlayici.current = setTimeout(async () => {
      setAramaYukleniyor(true);
      try {
        const res = await fetch(`/api/admin/prova/ara?q=${encodeURIComponent(deger.trim())}`);
        const d = await res.json().catch(() => null);
        setAramaSonuc(d?.sonuclar ?? []);
      } finally {
        setAramaYukleniyor(false);
      }
    }, 300);
  }

  function katilimciSec(k: AramaSonucu) {
    setSecilenId(k.id);
    setSecilenAd(k.full_name);
    setArama("");
    setAramaSonuc([]);
  }

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
    if (e === "baslat" && !secilenId) return; // güvenlik kilidi: katılımcısız başlatılamaz
    if (onayMetni && !window.confirm(onayMetni)) return;
    setBekle(e);
    try {
      const res = await fetch("/api/admin/prova", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          e === "baslat" ? { eylem: e, katilimciId: secilenId } : { eylem: e }
        ),
      });
      const d = await res.json().catch(() => null);
      if (!d?.ok) {
        if (d?.hata) window.alert(d.hata);
        return;
      }
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
          {katilimciSayisi} kayıtlı katılımcı (kampa hiçbiri etkilenmez)
        </span>
      </div>

      {aktif && son && (
        <p className="text-sm text-emerald-400">Son tur: {son}</p>
      )}

      {/* GÜVENLİK KİLİDİ: prova YALNIZ seçilen tek katılımcıyla koşar. */}
      {!aktif && (
        <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-4">
          <p className="text-sm font-semibold text-gold-light">
            🔒 Prova katılımcısı — zorunlu
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Yalnızca seçtiğin kişiye görev/ses/bildirim gider; başka hiç kimse
            (gerçek onboarding'deki kimse) etkilenmez.
          </p>
          {secilenId ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-400/10 px-3 py-2 ring-1 ring-emerald-400/20">
              <span className="text-sm font-medium text-emerald-300">
                ✓ Seçili: {secilenAd}
              </span>
              <button
                onClick={() => {
                  setSecilenId(null);
                  setSecilenAd(null);
                }}
                className="text-xs text-slate-400 underline hover:text-slate-200"
              >
                değiştir
              </button>
            </div>
          ) : (
            <div className="relative mt-3">
              <input
                type="text"
                value={arama}
                onChange={(e) => aramaDegisti(e.target.value)}
                placeholder="Katılımcı adı ara (en az 2 harf)…"
                className="w-full rounded-lg border border-royal-light/30 bg-midnight-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-gold"
              />
              {aramaYukleniyor && (
                <p className="mt-1 text-xs text-slate-500">Aranıyor…</p>
              )}
              {aramaSonuc.length > 0 && (
                <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-royal-light/20 bg-midnight-card p-1.5">
                  {aramaSonuc.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => katilimciSec(k)}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      <span>{k.full_name}</span>
                      {k.team && <span className="text-xs text-slate-500">{k.team}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Eylemler */}
      {!aktif ? (
        <button
          onClick={() =>
            eylem(
              "baslat",
              `Prova kampını başlat?\n\nGün 1'den itibaren YALNIZ "${secilenAd}" kişisine gerçek görev/ses/bildirim gitmeye başlayacak (hızlandırılmış). Başka kimse etkilenmez. Devam?`
            )
          }
          disabled={bekle !== null || !secilenId}
          className="rounded-xl bg-gold px-6 py-3 font-bold text-[#1a1206] shadow-lg shadow-gold/20 transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {bekle === "baslat"
            ? <Bekle />
            : secilenId
              ? `▶ Prova Kampını Başlat (Gün 1) — ${secilenAd}`
              : "▶ Önce bir katılımcı seç"}
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
