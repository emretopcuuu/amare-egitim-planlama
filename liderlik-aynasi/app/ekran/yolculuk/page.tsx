import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaCekirdek } from "@/lib/pusula";

export const metadata = { title: "Canlı Yolculuk" };
export const revalidate = 15;

// [1.4] CANLI YOLCULUK SAHNE GÖRÜNÜMÜ — admin'in seçtiği TEK katılımcının 3 günlük
// yolculuğu: pusula cümlesi → seçili görev yanıtları → dış puan değişimi → yeni
// cümlesi. Kişi seçilmeden / onaysızsa ekran boş. (sahne_onay=true şartı.)
export default async function YolculukPage() {
  const db = supabaseAdmin();
  const { data: secimAyar } = await db
    .from("settings").select("value").eq("key", "sahne_yolculuk_kisi").maybeSingle();
  const kisiId = secimAyar?.value ?? null;

  let kisi: { id: string; full_name: string; sahne_onay: boolean } | null = null;
  if (kisiId) {
    const { data } = await db
      .from("participants").select("id, full_name, sahne_onay").eq("id", kisiId).maybeSingle();
    kisi = data;
  }

  // Onaysız veya seçilmemiş → boş sahne (mahremiyet).
  if (!kisi || !kisi.sahne_onay) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#050a16] p-10 text-center">
        <p className="text-2xl text-slate-500">Sahne hazırlanıyor…</p>
      </main>
    );
  }

  const [cekirdek, { data: yanitlar }, { data: puanlar }, { data: bosluk }] = await Promise.all([
    pusulaCekirdek(db, kisi.id),
    db.from("missions").select("title, response_text, scored_at").eq("participant_id", kisi.id)
      .eq("status", "scored").not("response_text", "is", null).order("scored_at", { ascending: true }).limit(3),
    db.from("ratings").select("score, wave, is_self").eq("target_id", kisi.id).eq("is_self", false).not("wave", "is", null),
    db.from("bosluk_ani").select("yeni_cumle").eq("participant_id", kisi.id).maybeSingle(),
  ]);

  const ad = kisi.full_name.split(" ")[0];
  const pusulaCumle = cekirdek?.cekirdek_neden?.[0] ?? cekirdek?.ic_engel ?? null;
  const yeniCumle = bosluk?.yeni_cumle ?? null;

  // Dış puan değişimi: ilk dalga → son dalga ortalaması.
  const dalgaTop = new Map<number, { t: number; n: number }>();
  for (const p of puanlar ?? []) {
    if (p.wave == null) continue;
    const e = dalgaTop.get(p.wave) ?? { t: 0, n: 0 };
    e.t += p.score; e.n += 1; dalgaTop.set(p.wave, e);
  }
  const dalgalar = [...dalgaTop.entries()].sort((a, b) => a[0] - b[0]);
  const ilkOrt = dalgalar[0] ? dalgalar[0][1].t / dalgalar[0][1].n : null;
  const sonOrt = dalgalar.length > 1 ? dalgalar[dalgalar.length - 1][1].t / dalgalar[dalgalar.length - 1][1].n : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#050a16] p-10 text-center text-slate-100">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-gold-light/70">Canlı Yolculuk</p>
      <h1 className="font-display text-5xl font-bold text-gold-light">{ad}</h1>

      {pusulaCumle && (
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Gün 1 — Yola çıkarken</p>
          <p className="mt-2 text-2xl italic text-slate-300">{`"${pusulaCumle}"`}</p>
        </div>
      )}

      {(yanitlar?.length ?? 0) > 0 && (
        <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
          {(yanitlar ?? []).map((y, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
              <p className="text-sm leading-snug text-slate-200">{`"${(y.response_text ?? "").slice(0, 140)}"`}</p>
            </div>
          ))}
        </div>
      )}

      {ilkOrt != null && sonOrt != null && (
        <div className="flex items-center gap-5 text-4xl font-bold">
          <span className="text-slate-500">{ilkOrt.toFixed(1)}</span>
          <span className="text-gold" aria-hidden>→</span>
          <span className="text-emerald-300">{sonOrt.toFixed(1)}</span>
          <span className="text-base font-normal text-slate-400">kampın gözünde</span>
        </div>
      )}

      {yeniCumle && (
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-light/70">Gün 3 — Şimdi</p>
          <p className="mt-2 font-display text-3xl font-bold text-gold-light">{`"${yeniCumle}"`}</p>
        </div>
      )}
    </main>
  );
}
