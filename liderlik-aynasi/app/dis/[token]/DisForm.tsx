"use client";

import { useState } from "react";

type Soru = { kod: string; metin: string };

// [E11] Dış değerlendirme formu (oturumsuz): 3 kısa 1-5 sorusu + isteğe bağlı not
// + KVKK onayı. Kimlik toplanmaz.
export default function DisForm({ token, ad, sorular }: { token: string; ad: string; sorular: Soru[] }) {
  const [cevaplar, setCevaplar] = useState<Record<string, number>>({});
  const [yorum, setYorum] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [durum, setDurum] = useState<"hazir" | "gonderiliyor" | "oldu" | "hata">("hazir");

  const tamam = sorular.every((s) => cevaplar[s.kod]) && kvkk;

  async function gonder() {
    if (!tamam || durum === "gonderiliyor") return;
    setDurum("gonderiliyor");
    try {
      const r = await fetch("/api/dis-degerlendirme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, cevaplar, yorum, kvkk }),
      });
      setDurum(r.ok ? "oldu" : "hata");
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "oldu") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6 text-center">
        <p className="text-4xl" aria-hidden>🙏</p>
        <p className="mt-2 text-lg font-semibold text-emerald-300">Teşekkürler.</p>
        <p className="mt-1 text-sm text-slate-400">{ad} için dürüst gözün çok değerli.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorular.map((s) => (
        <div key={s.kod} className="rounded-2xl border border-white/10 bg-midnight-card/50 p-4">
          <p className="text-sm text-slate-200">{s.metin}</p>
          <div className="mt-3 flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCevaplar((c) => ({ ...c, [s.kod]: n }))}
                className={`h-11 flex-1 rounded-xl border-2 text-base font-bold transition-colors ${
                  cevaplar[s.kod] === n
                    ? "border-gold bg-gold/20 text-gold-light"
                    : "border-white/15 text-slate-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>Katılmıyorum</span>
            <span>Kesinlikle</span>
          </div>
        </div>
      ))}

      <textarea
        value={yorum}
        onChange={(e) => setYorum(e.target.value)}
        rows={3}
        maxLength={800}
        placeholder="İstersen tek cümle ekle (isteğe bağlı)…"
        className="w-full rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 text-sm text-slate-100 outline-none focus:border-gold"
      />

      <label className="flex items-start gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} className="mt-0.5 accent-gold" />
        <span>
          Bu değerlendirmenin {ad}&apos;in gelişim aynasında anonim olarak kullanılmasını onaylıyorum. İsim/iletişim
          bilgim toplanmaz. (KVKK)
        </span>
      </label>

      {durum === "hata" && <p className="text-center text-sm text-rose-300">Kaydedilemedi — bağlantı kullanılmış olabilir.</p>}
      <button
        onClick={() => void gonder()}
        disabled={!tamam || durum === "gonderiliyor"}
        className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
      >
        {durum === "gonderiliyor" ? "Gönderiliyor…" : "Gönder"}
      </button>
    </div>
  );
}
