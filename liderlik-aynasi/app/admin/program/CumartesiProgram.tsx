import {
  CUMARTESI_GRUP_SAYISI,
  CUMARTESI_PROGRAMI,
  DAVID_SEANSLARI,
  ETKINLIK_SIMGE,
  grupBloklari,
  grupBosPencereler,
  grupAdi,
} from "@/lib/cumartesiProgrami";
import CumartesiGorevDugmesi from "@/components/CumartesiGorevDugmesi";

function dkSaat(dk: number): string {
  return `${String(Math.floor(dk / 60)).padStart(2, "0")}:${String(dk % 60).padStart(2, "0")}`;
}

// Cumartesi (Gün 2) grup programı — admin görünümü. 15 grubun günü, David
// seansları ve AYNA'nın görev verebileceği BOŞ pencereler tek yerde. Salt
// görsel (lib/cumartesiProgrami tek doğruluk kaynağı).
export default function CumartesiProgram() {
  return (
    <div className="space-y-6">
      {/* David seansları — 5 seans × 3 grup */}
      <div className="rounded-xl bg-midnight-soft/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">
          👤 David Seansları (her seans 30 kişi · 3 grup)
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {DAVID_SEANSLARI.map((s) => (
            <li key={s.ad} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-royal-light">
                {s.baslangic}–{s.bitis}
              </span>
              <span className="font-medium text-slate-200">{s.ad}</span>
              <span className="text-slate-400">
                {s.gruplar.map((g) => grupAdi(g)).join(" + ")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Grup grup çizelge + boş pencereler */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: CUMARTESI_GRUP_SAYISI }, (_, i) => i + 1).map((g) => {
          const bloklar = grupBloklari(g);
          const bos = grupBosPencereler(g);
          return (
            <div key={g} className="rounded-xl border border-royal/20 bg-midnight-card/40 p-4">
              <p className="text-sm font-bold text-gold-light">{grupAdi(g)}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {bloklar.map((b, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="w-24 shrink-0 font-mono text-royal-light">
                      {b.baslangic}–{b.bitis}
                    </span>
                    <span className="text-slate-200">
                      {ETKINLIK_SIMGE[b.tur]} {b.baslik}
                      {b.detay ? <span className="text-slate-500"> · {b.detay}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {bos.length > 0 && (
                <p className="mt-2 text-[0.7rem] leading-relaxed text-emerald-300">
                  ✦ AYNA görev penceresi:{" "}
                  {bos.map((p) => `${dkSaat(p.bas)}–${dkSaat(p.bit)}`).join(" · ")}
                </p>
              )}
              {/* Manuel tetik: grubu o anki etkinliğine göre şimdi görevlendir */}
              <CumartesiGorevDugmesi grup={g} />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Toplam {CUMARTESI_PROGRAMI.length} blok · {CUMARTESI_GRUP_SAYISI} grup. AYNA, her
        grubun <span className="text-slate-400">o anki etkinliğine özel</span> görev üretir
        (David seansında foto/soru, oyunlarda gözlem, yemekte bağ kurma) — etkinliği bölmeden
        içine oturur. Yeşil "görev penceresi" boş aralıkları gösterir; "⚡ Şimdi görevlendir"
        ile grubu el ile de tetikleyebilirsin.
      </p>
    </div>
  );
}
