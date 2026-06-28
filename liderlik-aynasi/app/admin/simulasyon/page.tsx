import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kariyerHalKisidenTuret } from "@/lib/persona";
import { durumOku } from "@/lib/simulasyon/motor";
import { SIM_ADIMLAR, SIM_TOPLAM } from "@/lib/simulasyon/adimlar";
import Ipucu from "../Ipucu";
import SimulasyonKumanda from "./SimulasyonKumanda";
import SimGozlem, { type SimKisiGozlem } from "./SimGozlem";

export const metadata = { title: "Kamp Prova Simülatörü — Liderlik Aynası" };
export const dynamic = "force-dynamic";

export default async function SimulasyonPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const durum = await durumOku(db);

  const { data: kisilerHam } = await db
    .from("participants")
    .select(
      "id, full_name, team, city, login_code, camp_unlocked_at, kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay"
    )
    .eq("simulasyon", true)
    .order("created_at");

  const kisiler = kisilerHam ?? [];
  const ids = kisiler.map((k) => k.id);

  // Gözlem verileri — görevler + alınan puan ortalaması (tek seferde topla).
  let gozlem: SimKisiGozlem[] = [];
  if (ids.length > 0) {
    const [{ data: gorevler }, { data: puanlar }, { data: pusulalar }] = await Promise.all([
      db
        .from("missions")
        .select("participant_id, title, body, status, ai_score, ai_comment, response_text, kind, issued_at")
        .in("participant_id", ids)
        .order("issued_at", { ascending: true }),
      db.from("ratings").select("target_id, score, is_self").in("target_id", ids),
      db.from("pusula").select("participant_id, slogan").in("participant_id", ids),
    ]);

    const gorevMap = new Map<string, SimKisiGozlem["gorevler"]>();
    for (const g of gorevler ?? []) {
      const liste = gorevMap.get(g.participant_id) ?? [];
      liste.push({
        baslik: g.title,
        govde: g.body,
        durum: g.status,
        tur: g.kind,
        puan: g.ai_score,
        yorum: g.ai_comment,
        yanit: g.response_text,
        tarih: g.issued_at,
      });
      gorevMap.set(g.participant_id, liste);
    }

    // Alınan akran puanı ortalaması (öz hariç).
    const puanTopla = new Map<string, { top: number; adet: number }>();
    for (const p of puanlar ?? []) {
      if (p.is_self) continue;
      const cur = puanTopla.get(p.target_id) ?? { top: 0, adet: 0 };
      cur.top += p.score;
      cur.adet += 1;
      puanTopla.set(p.target_id, cur);
    }
    const sloganMap = new Map((pusulalar ?? []).map((p) => [p.participant_id, p.slogan]));

    gozlem = kisiler.map((k) => {
      const persona = kariyerHalKisidenTuret({
        kariyer_seviyesi: k.kariyer_seviyesi,
        en_yuksek_kariyer: k.en_yuksek_kariyer,
        gecen_ay_kariyer: k.gecen_ay_kariyer,
        kidem_ay: k.kidem_ay,
      });
      const pt = puanTopla.get(k.id);
      return {
        id: k.id,
        ad: k.full_name.replace("Sim · ", ""),
        takim: k.team,
        sehir: k.city,
        kod: k.login_code,
        kampAcik: !!k.camp_unlocked_at,
        personaKod: persona?.kisaKod ?? null,
        personaEtiket: persona?.etiket ?? null,
        slogan: sloganMap.get(k.id) ?? null,
        ortalama: pt && pt.adet > 0 ? Math.round((pt.top / pt.adet) * 10) / 10 : null,
        gorevler: gorevMap.get(k.id) ?? [],
      };
    });
  }

  const adim = SIM_ADIMLAR[durum.adim] ?? null;
  const bitti = durum.adim >= SIM_ADIMLAR.length - 1;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">🎬 Kamp Prova Simülatörü</h1>
          <Ipucu
            baslik="Kamp Prova Simülatörü"
            metin={[
              "NE: 20 sanal karakterle tüm kampı adım adım canlandırır.",
              "NASIL: Her 'İleri' bir aşamayı yürütür; ne olduğunu görür, sonra devam edersin.",
              "DİKKAT: Gerçek katılımcılara dokunmaz — 'Sıfırla' tüm sim verisini siler.",
            ]}
          />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Pazartesi gerçek kişilerle çalışmadan önce; karakterlerin gördüğü ekranları,
          aldığı görevleri ve senin admin deneyimini önden yaşa.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
        ⚠️ Bu sayfa <strong>gerçek dalga ve mühür ayarlarını</strong> geçici olarak değiştirir
        (admin deneyimini gerçekçi kılmak için). <strong>Sıfırla</strong> hepsini geri alır ve
        sim karakterleri siler. Gerçek katılımcı verisine dokunulmaz.
      </div>

      <SimulasyonKumanda
        durum={durum}
        adimlar={SIM_ADIMLAR}
        toplam={SIM_TOPLAM}
        simdikiAdim={adim}
        bitti={bitti}
        karakterSayisi={kisiler.length}
      />

      {gozlem.length > 0 && <SimGozlem kisiler={gozlem} />}
    </main>
  );
}
