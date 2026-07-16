"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

export type SohbetMesaj = {
  id: string;
  gonderen_id: string;
  gonderen_admin: boolean;
  govde: string;
  created_at: string;
};

type Props = {
  benId: string;
  mod: "katilimci" | "admin";
  anahtar: string; // katılımcı: üye id | "yonetim"; admin: kişi id
  digerAd: string;
  baslangic: SohbetMesaj[];
};

function saat(ts: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

// İç mesajlaşma sohbet kutusu (grup arkadaşı / yönetim). Balonlar: benimkiler
// sağda altın, karşının solda. 8 sn'de bir + odakta yoklar (canlı his). Saf
// istemci durumu + iyimser ekleme.
export default function SohbetKutusu({ benId, mod, anahtar, digerAd, baslangic }: Props) {
  const [mesajlar, setMesajlar] = useState<SohbetMesaj[]>(baslangic);
  const [taslak, setTaslak] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const sonRef = useRef<HTMLDivElement>(null);
  const akisRef = useRef<HTMLDivElement>(null);
  const oncekiSayi = useRef(baslangic.length);

  const pollUrl = mod === "admin"
    ? `/api/admin/mesaj?sohbet=${encodeURIComponent(anahtar)}`
    : `/api/mesaj?sohbet=${encodeURIComponent(anahtar)}`;

  const benimMi = useCallback(
    (m: SohbetMesaj) => (mod === "admin" ? m.gonderen_admin : !m.gonderen_admin && m.gonderen_id === benId),
    [mod, benId],
  );

  const yokla = useCallback(async () => {
    try {
      const r = await fetch(pollUrl, { cache: "no-store" });
      if (!r.ok) return;
      const { mesajlar: m } = (await r.json()) as { mesajlar?: SohbetMesaj[] };
      if (Array.isArray(m)) setMesajlar(m);
    } catch {
      // ağ oynak — sessiz geç
    }
  }, [pollUrl]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void yokla();
    }, 8000);
    function onGorunur() {
      if (document.visibilityState === "visible") void yokla();
    }
    document.addEventListener("visibilitychange", onGorunur);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onGorunur);
    };
  }, [yokla]);

  // Yeni mesajda en alta kaydır — AMA yalnız kişi zaten dipteyse ya da son
  // mesaj kendisininse. Eskiden 8 sn'lik yoklama her turda zorla en alta
  // kaydırıyordu: eski mesajları okuyan kişi sürekli aşağı fırlatılıyordu.
  useEffect(() => {
    const yeniGeldi = mesajlar.length > oncekiSayi.current;
    oncekiSayi.current = mesajlar.length;
    if (!yeniGeldi) return;
    const son = mesajlar[mesajlar.length - 1];
    const benimki = !!son && benimMi(son);
    // Kaydırma kabı iç kap ise onun konumuna, değilse sayfa konumuna bak.
    const kap = akisRef.current;
    const kapKayar = !!kap && kap.scrollHeight > kap.clientHeight + 8;
    const dipte = kapKayar
      ? kap.scrollHeight - kap.scrollTop - kap.clientHeight < 140
      : window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
    if (benimki || dipte) {
      sonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [mesajlar, benimMi]);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    const metin = taslak.trim();
    if (!metin || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    titret(10);
    try {
      const govde = mod === "admin"
        ? JSON.stringify({ kisiId: anahtar, govde: metin })
        : JSON.stringify({ hedef: anahtar, govde: metin });
      const url = mod === "admin" ? "/api/admin/mesaj" : "/api/mesaj";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: govde,
      });
      const veri = (await r.json().catch(() => ({}))) as { tamam?: boolean; hata?: string };
      if (!r.ok || !veri.tamam) {
        setHata(veri.hata ?? "Mesaj gönderilemedi.");
        return;
      }
      setTaslak("");
      await yokla();
    } catch {
      setHata("Bağlantı hatası — tekrar dene.");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      {/* Mesaj akışı */}
      <div ref={akisRef} className="flex-1 space-y-2.5 overflow-y-auto pb-4">
        {mesajlar.length === 0 ? (
          <div className="kart-cam rounded-3xl p-8 text-center">
            <p className="text-4xl" aria-hidden>💬</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Henüz mesaj yok. İlk mesajı sen yaz — {digerAd} bildirim alacak.
            </p>
          </div>
        ) : (
          mesajlar.map((m) => {
            const benim = benimMi(m);
            return (
              <div key={m.id} className={`flex ${benim ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                    benim
                      ? "rounded-br-md bg-gold/90 text-[#1a1206]"
                      : "rounded-bl-md border border-white/12 bg-midnight-card text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.govde}</p>
                  <p className={`mt-1 text-[0.65rem] ${benim ? "text-[#1a1206]/60" : "text-slate-400"}`}>
                    {saat(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={sonRef} />
      </div>

      {/* Yazma kutusu */}
      <form onSubmit={gonder} className="sticky bottom-0 mt-2 flex items-end gap-2 pb-2">
        <textarea
          value={taslak}
          onChange={(e) => setTaslak(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void gonder(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder={`${digerAd} kişisine yaz…`}
          className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/15 bg-midnight-card/80 px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold/50"
        />
        <MikrofonButonu
          ikon
          onMetin={(p) => setTaslak((g) => (g.trim() ? `${g.trim()} ${p}` : p))}
        />
        <button
          type="submit"
          disabled={!taslak.trim() || gonderiliyor}
          aria-label="Gönder"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold text-xl font-bold text-[#1a1206] transition-transform active:scale-90 disabled:opacity-40"
        >
          {gonderiliyor ? "…" : "↑"}
        </button>
      </form>
      {hata && <p className="pb-2 text-center text-xs text-red-300">{hata}</p>}
    </div>
  );
}
