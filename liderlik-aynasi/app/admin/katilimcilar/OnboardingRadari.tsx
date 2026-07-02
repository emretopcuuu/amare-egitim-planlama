import { supabaseAdmin } from "@/lib/supabase/server";
import OnboardingHatirlat from "./OnboardingHatirlat";

// [M2/M3/M9] ONBOARDING RADARI — üç kritik hazırlık sinyalini kişi bazında tek
// bakışta: Değerler bitti mi, oyununu seçti mi (grup atandı mı), push izni var mı.
// KVKK: yalnız SONUÇ gösterilir (bitti/bitmedi + isim), paylaşılan içerik değil.
// Eksik kalanların isimleri operatör için listelenir; Değerler/Oyun için tek tık
// hatırlatma (push izni olmayan uygulama içi gelen kutusundan görür).

type Satir = {
  ikon: string;
  ad: string;
  tamam: number;
  toplam: number;
  eksikAdlar: string[];
  hatirlatHedef?: "degerler" | "oyun";
  pushNotu?: boolean; // push için "hatırlatılamaz" notu
};

function RadarSatiri({ s }: { s: Satir }) {
  const eksik = s.eksikAdlar.length;
  const oran = s.toplam > 0 ? Math.round((s.tamam / s.toplam) * 100) : 0;
  const tumTamam = eksik === 0;
  return (
    <div className="rounded-xl bg-midnight-soft/60 p-3">
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden>{s.ikon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">{s.ad}</span>
          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <span
              className={`block h-full rounded-full ${tumTamam ? "bg-emerald-400" : "bg-gradient-to-r from-gold-dim to-gold"}`}
              style={{ width: `${oran}%` }}
            />
          </span>
        </span>
        <span className={`shrink-0 font-mono text-sm font-bold ${tumTamam ? "text-emerald-300" : "text-slate-300"}`}>
          {s.tamam}/{s.toplam}
        </span>
        {s.hatirlatHedef && <OnboardingHatirlat hedef={s.hatirlatHedef} eksik={eksik} />}
      </div>
      {eksik > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-amber-300/90 [&::-webkit-details-marker]:hidden">
            {eksik} kişi eksik{s.pushNotu ? " — bunlara push gidemez, WhatsApp'tan takip et" : ""} · göster
          </summary>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {s.eksikAdlar.map((ad, i) => (
              <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-[0.7rem] text-slate-300">
                {ad}
              </span>
            ))}
          </p>
        </details>
      )}
    </div>
  );
}

export default async function OnboardingRadari() {
  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: degerlerTamam }, { data: aboneler }] = await Promise.all([
    db.from("participants").select("id, full_name, team").eq("role", "participant").order("full_name"),
    db.from("degerler_calismasi").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("push_subscriptions").select("participant_id"),
  ]);

  const kisi = kisiler ?? [];
  const toplam = kisi.length;
  const degerlerSet = new Set((degerlerTamam ?? []).map((r) => r.participant_id));
  const pushSet = new Set((aboneler ?? []).map((a) => a.participant_id));
  const ad = (k: { full_name: string }) => k.full_name.split(" ")[0];

  const degerlerEksik = kisi.filter((k) => !degerlerSet.has(k.id));
  const oyunEksik = kisi.filter((k) => !k.team);
  const pushEksik = kisi.filter((k) => !pushSet.has(k.id));

  const satirlar: Satir[] = [
    {
      ikon: "💎",
      ad: "Değerler çalışması",
      tamam: toplam - degerlerEksik.length,
      toplam,
      eksikAdlar: degerlerEksik.map(ad),
      hatirlatHedef: "degerler",
    },
    {
      ikon: "🎲",
      ad: "Oyun seçimi / grup",
      tamam: toplam - oyunEksik.length,
      toplam,
      eksikAdlar: oyunEksik.map(ad),
      hatirlatHedef: "oyun",
    },
    {
      ikon: "🔔",
      ad: "Push izni",
      tamam: toplam - pushEksik.length,
      toplam,
      eksikAdlar: pushEksik.map(ad),
      pushNotu: true,
    },
  ];

  return (
    <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-100">
        📡 Onboarding Radarı
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Değerler · oyun seçimi · push izni — kim hazır, kim eksik. (İçerik değil, yalnız sonuç.)
      </p>
      <div className="space-y-2.5">
        {satirlar.map((s) => (
          <RadarSatiri key={s.ad} s={s} />
        ))}
      </div>
    </div>
  );
}
