"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Bekle from "@/components/Bekle";
import type { OyunPlani, PlanMadde, PlanUfuk } from "@/lib/oyunPlani";

// PLAN ATÖLYESİ — kişi karar verir, AYNA danışman. AI önerisi "öneri" olarak
// gelir; kişi her maddeyi kabul/düzenle/çıkar, kendi maddesini ekler, takıldığı
// yerde AYNA'ya danışır. "Planım hazır" → onaylanır (kilit) → Sözünü Ver açılır.

type UfukTanim = { key: PlanUfuk; etiket: string; alt: string; ikon: string };
const UFUKLAR: UfukTanim[] = [
  { key: "ilk_72_saat", etiket: "İlk 72 Saat", alt: "Kamptan çıkınca ilk 3 gün — küçük kıvılcımlar", ikon: "⚡" },
  { key: "on_gun", etiket: "İlk 10 Gün", alt: "İlk momentum, aktivasyon", ikon: "🌱" },
  { key: "kirk_gun", etiket: "İlk 40 Gün", alt: "Tempo + ilk ekip hamlesi", ikon: "🔥" },
  { key: "doksan_gun", etiket: "İlk 90 Gün", alt: "Ana hedefe varış", ikon: "🏔️" },
];

type PlanDurumu = Record<PlanUfuk, PlanMadde[]>;

function planiCikar(p: OyunPlani): PlanDurumu {
  return {
    ilk_72_saat: [...p.ilk_72_saat],
    on_gun: [...p.on_gun],
    kirk_gun: [...p.kirk_gun],
    doksan_gun: [...p.doksan_gun],
  };
}

export default function PlanAtolyesi({ plan }: { plan: OyunPlani }) {
  const router = useRouter();
  const [durum, setDurum] = useState(plan.durum);
  const [veri, setVeri] = useState<PlanDurumu>(planiCikar(plan));
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // "ufuk:idx"
  const [danisAcik, setDanisAcik] = useState<{ ufuk: PlanUfuk; idx: number } | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const toplamMadde = UFUKLAR.reduce((t, u) => t + veri[u.key].length, 0);

  function maddeGuncelle(ufuk: PlanUfuk, idx: number, alan: keyof PlanMadde, deger: string) {
    setVeri((v) => {
      const dizi = [...v[ufuk]];
      dizi[idx] = { ...dizi[idx], [alan]: deger, kaynak: "duzenlendi" };
      return { ...v, [ufuk]: dizi };
    });
  }
  function maddeSil(ufuk: PlanUfuk, idx: number) {
    setVeri((v) => ({ ...v, [ufuk]: v[ufuk].filter((_, i) => i !== idx) }));
    setDuzenlenen(null);
  }
  function maddeEkle(ufuk: PlanUfuk) {
    setVeri((v) => {
      const dizi = [...v[ufuk], { baslik: "", aksiyon: "", olcut: "", kaynak: "kisi" as const }];
      return { ...v, [ufuk]: dizi };
    });
    setDuzenlenen(`${ufuk}:${veri[ufuk].length}`);
  }
  function secenekUygula(ufuk: PlanUfuk, idx: number, madde: PlanMadde) {
    setVeri((v) => {
      const dizi = [...v[ufuk]];
      dizi[idx] = { ...madde, kaynak: "duzenlendi" };
      return { ...v, [ufuk]: dizi };
    });
    setDanisAcik(null);
  }

  async function planimHazir() {
    if (toplamMadde === 0) {
      setHata("Sözünü verebilmen için en az bir madde olmalı.");
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      const k = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "kaydet", plan: veri }),
      });
      if (!k.ok) throw new Error();
      const o = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "onayla" }),
      });
      if (!o.ok) throw new Error();
      router.push("/sozum");
      router.refresh();
    } catch {
      setHata("Kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
      setGonderiliyor(false);
    }
  }

  async function gozdenGecir() {
    setGonderiliyor(true);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "gozden-gecir" }),
      });
      if (r.ok) setDurum("taslak");
    } finally {
      setGonderiliyor(false);
    }
  }

  // ---- ONAYLI (kilitli) görünüm ----
  if (durum === "onaylandi") {
    return (
      <div className="space-y-5">
        <header className="text-center">
          <p className="text-4xl" aria-hidden>🔒</p>
          <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">Planın hazır ve kilitli</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Bu senin kararın. Sözünü verince taahhüdün olur.
          </p>
        </header>
        {UFUKLAR.map((u) =>
          veri[u.key].length === 0 ? null : (
            <section key={u.key} className="kart-cam rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                {u.ikon} {u.etiket}
              </p>
              <ul className="mt-3 space-y-3">
                {veri[u.key].map((m, i) => (
                  <li key={i} className="border-l-2 border-gold/30 pl-3">
                    <p className="font-semibold text-slate-100">{m.baslik}</p>
                    <p className="mt-0.5 text-sm text-slate-300">{m.aksiyon}</p>
                    {m.olcut && <p className="mt-0.5 text-xs text-slate-500">📏 {m.olcut}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
        <div className="space-y-3">
          <Link
            href="/sozum"
            className="parilti btn-kor flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            Sözünü Ver →
          </Link>
          <button
            onClick={gozdenGecir}
            disabled={gonderiliyor}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-slate-300 transition-colors hover:border-gold/40 disabled:opacity-50"
          >
            {gonderiliyor ? <Bekle /> : "Planımı gözden geçir"}
          </button>
        </div>
      </div>
    );
  }

  // ---- ATÖLYE (düzenlenebilir) görünüm ----
  return (
    <div className="space-y-5">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold leading-tight">
          90 Günlük Oyun Planım
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Aşağıdakiler <span className="text-gold-light">AYNA'nın önerisi</span> — dayatma değil.
          Ne yapacağına <span className="font-semibold text-slate-100">sen</span> karar ver: kabul et,
          değiştir, çıkar ya da kendi maddeni ekle. Takılırsan bana danış.
        </p>
      </header>

      {plan.ozet && (
        <p className="prizma-serif ay-metin rounded-2xl border border-gold/20 bg-gold/[0.05] p-4 text-sm italic leading-snug text-gold-light/90">
          {plan.ozet}
        </p>
      )}

      {UFUKLAR.map((u) => (
        <section key={u.key} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light/80">
              {u.ikon} {u.etiket}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{u.alt}</p>
          </div>

          {veri[u.key].length === 0 && (
            <p className="rounded-xl border border-dashed border-white/12 px-4 py-3 text-sm text-slate-500">
              Bu ufukta madde yok. İstersen bir madde ekle.
            </p>
          )}

          <ul className="space-y-3">
            {veri[u.key].map((m, i) => {
              const anahtar = `${u.key}:${i}`;
              const duzen = duzenlenen === anahtar;
              return (
                <li key={i} className="kart-cam rounded-2xl p-4">
                  {duzen ? (
                    <div className="space-y-2">
                      <input
                        value={m.baslik}
                        onChange={(e) => maddeGuncelle(u.key, i, "baslik", e.target.value)}
                        placeholder="Başlık (kısa)"
                        className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-gold/50"
                      />
                      <textarea
                        value={m.aksiyon}
                        onChange={(e) => maddeGuncelle(u.key, i, "aksiyon", e.target.value)}
                        placeholder="Ne yapacaksın? (somut, ölçülebilir)"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-gold/50"
                      />
                      <input
                        value={m.olcut}
                        onChange={(e) => maddeGuncelle(u.key, i, "olcut", e.target.value)}
                        placeholder="Nasıl takip edeceksin? (sayı/sıklık)"
                        className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 outline-none focus:border-gold/50"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setDuzenlenen(null)}
                          className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-[#1a1206]"
                        >
                          Tamam
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-100">{m.baslik || "(başlıksız)"}</p>
                      <p className="mt-0.5 text-sm text-slate-300">{m.aksiyon}</p>
                      {m.olcut && <p className="mt-1 text-xs text-slate-500">📏 {m.olcut}</p>}
                      {m.kaynak && m.kaynak !== "ai" && (
                        <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-royal-light/70">
                          {m.kaynak === "kisi" ? "senin eklediğin" : "senin düzenlediğin"}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setDuzenlenen(anahtar)}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-gold/40"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          onClick={() =>
                            setDanisAcik(danisAcik?.ufuk === u.key && danisAcik.idx === i ? null : { ufuk: u.key, idx: i })
                          }
                          className="rounded-lg border border-royal/30 px-3 py-1.5 text-xs font-medium text-royal-light transition-colors hover:border-royal/60"
                        >
                          🤔 AYNA'ya danış
                        </button>
                        <button
                          onClick={() => maddeSil(u.key, i)}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300"
                        >
                          🗑️ Çıkar
                        </button>
                      </div>
                      {danisAcik?.ufuk === u.key && danisAcik.idx === i && (
                        <DanisPaneli
                          ufuk={u.key}
                          madde={m}
                          onSecenek={(sec) => secenekUygula(u.key, i, sec)}
                          onKapat={() => setDanisAcik(null)}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {veri[u.key].length < 3 && (
            <button
              onClick={() => maddeEkle(u.key)}
              className="w-full rounded-xl border border-dashed border-gold/30 py-2.5 text-sm font-medium text-gold-light/90 transition-colors hover:bg-gold/[0.06]"
            >
              ➕ Kendi maddeni ekle
            </button>
          )}
        </section>
      ))}

      <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-white/10 bg-[#04101c]/90 px-5 py-4 backdrop-blur">
        {hata && <p className="text-center text-sm font-medium text-red-400">{hata}</p>}
        <p className="text-center text-xs text-slate-500">
          Sözünü verince plan kilitlenir. Sonra "gözden geçir" ile güncelleyebilirsin.
        </p>
        <button
          onClick={planimHazir}
          disabled={gonderiliyor}
          className="parilti btn-kor flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-60"
        >
          {gonderiliyor ? <Bekle /> : "Planım hazır — Sözünü Ver"}
        </button>
      </div>
    </div>
  );
}

// AYNA danışman paneli — tek maddede tavsiye + 2 alternatif öneri. Karar kişinin.
function DanisPaneli({
  ufuk,
  madde,
  onSecenek,
  onKapat,
}: {
  ufuk: PlanUfuk;
  madde: PlanMadde;
  onSecenek: (m: PlanMadde) => void;
  onKapat: () => void;
}) {
  const [soru, setSoru] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tavsiye, setTavsiye] = useState<string | null>(null);
  const [secenekler, setSecenekler] = useState<PlanMadde[]>([]);
  const [hata, setHata] = useState(false);

  async function danis() {
    setYukleniyor(true);
    setHata(false);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "danis", ufuk, madde, soru: soru || null }),
      });
      const veri = await r.json();
      if (!r.ok || veri?.durum !== "hazir") {
        setHata(true);
        return;
      }
      setTavsiye(veri.tavsiye as string);
      setSecenekler((veri.secenekler as PlanMadde[]) ?? []);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-royal/25 bg-royal/[0.06] p-3">
      {!tavsiye ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Bu maddede takıldıysan bir sorunu yaz (istersen boş bırak), AYNA sana akıl versin.
          </p>
          <textarea
            value={soru}
            onChange={(e) => setSoru(e.target.value)}
            placeholder="Örn: Bu hafta gerçekçi kaç sunum yapabilirim?"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-royal/50"
          />
          {hata && <p className="text-xs font-medium text-red-400">Danışman şu an yanıt veremedi, tekrar dene.</p>}
          <div className="flex gap-2">
            <button
              onClick={danis}
              disabled={yukleniyor}
              className="rounded-lg bg-royal px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {yukleniyor ? <Bekle /> : "AYNA'ya danış"}
            </button>
            <button onClick={onKapat} className="rounded-lg px-3 py-1.5 text-sm text-slate-400">
              Kapat
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-200">{tavsiye}</p>
          {secenekler.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-royal-light/80">
                Seçebileceğin öneriler (istersen üstüne kendi cümleni yaz)
              </p>
              {secenekler.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSecenek(s)}
                  className="block w-full rounded-lg border border-white/12 bg-white/[0.02] p-3 text-left transition-colors hover:border-gold/40"
                >
                  <p className="text-sm font-semibold text-slate-100">{s.baslik}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{s.aksiyon}</p>
                  {s.olcut && <p className="mt-0.5 text-xs text-slate-500">📏 {s.olcut}</p>}
                  <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-gold-light/70">bunu benimki yap →</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={onKapat} className="text-sm text-slate-400 underline-offset-4 hover:underline">
            Kapat
          </button>
        </div>
      )}
    </div>
  );
}
