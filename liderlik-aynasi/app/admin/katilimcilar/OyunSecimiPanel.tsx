import { supabaseAdmin } from "@/lib/supabase/server";
import {
  oyunKombolari,
  grupAdi,
  grupNoCozumle,
  OYUN_BILGI,
} from "@/lib/cumartesiProgrami";
import Katlanir from "../Katlanir";

const GRUP_KAPASITE = 10;

// Admin: oyun seçimi ile dağıtım paneli. Her oyun ikilisinin grup doluluklarını
// tek bakışta gösterir (atanmamış kişi dahil). Seçim her zaman açıktır.
export default async function OyunSecimiPanel() {
  const db = supabaseAdmin();
  const { data: kisiler } = await db.from("participants").select("team").eq("role", "participant");

  const sayim = new Map<number, number>();
  let atanmamis = 0;
  let toplam = 0;
  for (const k of kisiler ?? []) {
    toplam++;
    const g = grupNoCozumle(k.team);
    if (g) sayim.set(g, (sayim.get(g) ?? 0) + 1);
    else atanmamis++;
  }
  const kombolar = oyunKombolari();

  return (
    <Katlanir
      baslik="Oyun Seçimi ile Dağıtım"
      aciklama="Bowling herkes · diğer 3'ten 2 seçim → uygun gruba otomatik atama"
      ikon="🎲"
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-400">
          Grubu olmayan her katılımcı girişte 2 oyun seçer ve o ikiliyi oynayan
          gruplardan en boş olanına atanır. Atama tek seferliktir. Toplam{" "}
          <span className="font-semibold text-slate-200">{toplam}</span> kişi ·{" "}
          <span className="font-semibold text-amber-300">{atanmamis}</span> henüz atanmadı.
        </p>

        <div className="space-y-3">
          {kombolar.map((k) => {
            const dolu = k.gruplar.reduce((t, g) => t + (sayim.get(g) ?? 0), 0);
            const kapasite = k.gruplar.length * GRUP_KAPASITE;
            return (
              <div key={k.oyunlar.join("+")} className="rounded-xl bg-midnight-soft/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">
                    🎳 Bowling +{" "}
                    {k.oyunlar.map((o) => `${OYUN_BILGI[o].simge} ${OYUN_BILGI[o].ad}`).join(" + ")}
                  </p>
                  <span
                    className={`shrink-0 font-mono text-xs font-bold ${
                      dolu > kapasite ? "text-amber-300" : "text-slate-400"
                    }`}
                  >
                    {dolu}/{kapasite}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {k.gruplar.map((g) => {
                    const n = sayim.get(g) ?? 0;
                    return (
                      <span
                        key={g}
                        className={`rounded-md px-2 py-0.5 text-[0.7rem] font-medium ${
                          n >= GRUP_KAPASITE
                            ? "bg-amber-500/20 text-amber-200"
                            : n > 0
                              ? "bg-royal/25 text-royal-light"
                              : "bg-white/5 text-slate-500"
                        }`}
                      >
                        {grupAdi(g)}: {n}/{GRUP_KAPASITE}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Katlanir>
  );
}
