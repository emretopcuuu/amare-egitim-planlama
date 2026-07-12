"use client";

import { useState } from "react";

// KAPANIŞ Faz B — Emre'nin CANLI SAHNE kontrolleri (eğitim sırasında kullanılır):
//  • Kanıt anı (öneri 4): /ekran'a isimsiz agregat tam-ekran.
//  • Canlı nabız (öneri 5): seçenekli soru → herkese, /ekran'da canlı toplam.
//  • Emre'nin Sorusu (öneri 6): açık uçlu → cevap kişinin söz tohumu olur.
const KANITLAR: { id: string; etiket: string }[] = [
  { id: "ic_engel", etiket: "İç engeller" },
  { id: "kas", etiket: "Kaslar" },
  { id: "taahhut", etiket: "Sözler" },
  { id: "bahis", etiket: "Bahis skoru" },
];

async function post(body: unknown): Promise<{ ok: boolean; hata?: string }> {
  try {
    const r = await fetch("/api/admin/canli-soru", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; hata?: string };
    return { ok: r.ok && !!j.ok, hata: j.hata };
  } catch {
    return { ok: false, hata: "Ağ hatası" };
  }
}

function Durum({ mesaj }: { mesaj: string | null }) {
  if (!mesaj) return null;
  return <p className="mt-2 text-sm text-gold-light">{mesaj}</p>;
}

export default function CanliSahneKontrol() {
  const [kanitMesaj, setKanitMesaj] = useState<string | null>(null);
  const [nabizSoru, setNabizSoru] = useState("");
  const [nabizSec, setNabizSec] = useState("");
  const [nabizMesaj, setNabizMesaj] = useState<string | null>(null);
  const [tohumSoru, setTohumSoru] = useState("");
  const [tohumMesaj, setTohumMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  async function kanitAt(id: string, etiket: string) {
    setMesgul(true);
    const r = await post({ eylem: "kanit", kanitId: id });
    setKanitMesaj(r.ok ? `📺 "${etiket}" ekrana yansıdı (~90 sn).` : r.hata ?? "Olmadı.");
    setMesgul(false);
  }

  async function nabizAc() {
    setMesgul(true);
    const secenekler = nabizSec.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const r = await post({ eylem: "ac", tip: "nabiz", soru: nabizSoru, secenekler });
    if (r.ok) {
      setNabizMesaj("⚡ Soru açık — telefonlarda ve ekranda canlı.");
    } else setNabizMesaj(r.hata ?? "Olmadı.");
    setMesgul(false);
  }

  async function tohumAc() {
    setMesgul(true);
    const r = await post({ eylem: "ac", tip: "tohum", soru: tohumSoru });
    setTohumMesaj(r.ok ? "🌱 Emre'nin Sorusu açık — cevaplar söz tohumu olacak." : r.hata ?? "Olmadı.");
    setMesgul(false);
  }

  async function kapat(tip: "nabiz" | "tohum") {
    setMesgul(true);
    await post({ eylem: "kapat", tip });
    if (tip === "nabiz") setNabizMesaj("Soru kapatıldı.");
    else setTohumMesaj("Soru kapatıldı.");
    setMesgul(false);
  }

  return (
    <section className="space-y-5 rounded-2xl border border-royal/30 bg-midnight-card/40 p-5">
      <div>
        <h2 className="text-lg font-bold text-gold">🎬 Canlı sahne (eğitim sırasında)</h2>
        <p className="mt-1 text-sm text-slate-400">
          Bunlar <strong>eğitim anında</strong>, sahnedeyken kullanılır. Kanıt anları büyük ekrana
          (<code>/ekran</code>) yansır; sorular herkesin telefonuna düşer.
        </p>
      </div>

      {/* Öneri 4 — kanıt anları */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kanıt anı → ekrana</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {KANITLAR.map((k) => (
            <button
              key={k.id}
              onClick={() => kanitAt(k.id, k.etiket)}
              disabled={mesgul}
              className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/15 disabled:opacity-50"
            >
              📺 {k.etiket}
            </button>
          ))}
        </div>
        <Durum mesaj={kanitMesaj} />
      </div>

      {/* Öneri 5 — canlı nabız */}
      <div className="border-t border-royal/20 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">⚡ Canlı nabız sorusu</p>
        <input
          value={nabizSoru}
          onChange={(e) => setNabizSoru(e.target.value)}
          maxLength={240}
          placeholder="Soru (ör. Şu an neyi daha net görüyorsun?)"
          className="mt-2 w-full rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
        />
        <input
          value={nabizSec}
          onChange={(e) => setNabizSec(e.target.value)}
          placeholder="Seçenekler, virgülle (ör. Cesaret, Netlik, Disiplin)"
          className="mt-2 w-full rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={nabizAc} disabled={mesgul} className="btn-kor rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
            Sor
          </button>
          <button
            onClick={() => kapat("nabiz")}
            disabled={mesgul}
            className="rounded-xl border border-royal/40 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Kapat
          </button>
        </div>
        <Durum mesaj={nabizMesaj} />
      </div>

      {/* Öneri 6 — Emre'nin Sorusu (tohum) */}
      <div className="border-t border-royal/20 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🌱 Emre'nin Sorusu (söz tohumu)</p>
        <input
          value={tohumSoru}
          onChange={(e) => setTohumSoru(e.target.value)}
          maxLength={240}
          placeholder="Tek soru (ör. 90 gün sonra kime hangi sözü tutmuş olacaksın?)"
          className="mt-2 w-full rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={tohumAc} disabled={mesgul} className="btn-kor rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
            Sahneye aç
          </button>
          <button
            onClick={() => kapat("tohum")}
            disabled={mesgul}
            className="rounded-xl border border-royal/40 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Kapat
          </button>
        </div>
        <Durum mesaj={tohumMesaj} />
      </div>
    </section>
  );
}
