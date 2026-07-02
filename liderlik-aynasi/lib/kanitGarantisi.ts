import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";

type Db = ReturnType<typeof supabaseAdmin>;

// KANIT GARANTİSİ — Gün 2 akşamı sigortası.
// Boşluk Anı (FAZ 1), kişinin iç engelini kampta biriken GERÇEK + anonim kanıtla
// (akran yorumu + AYNA gözlemi + takdir) çürütür. Kanıtı eşiğin altında kalan kişi
// = "içi boş an" riski. Bu modül, o kişileri Gün 2 akşamı tespit edip akranlarına
// "onu gözle, gördüğün güçlü yanı yaz" mikro görevi verir; görev tamamlanınca yanıt
// HEDEFE anonim takdir (kudos) olarak yazılır (bkz. /api/gorev-yanit) → hedefin
// kanıt sayacı garanti yükselir.
//
// Kanıt sayacını yalnız kudos + ratings.comment + missions.ai_comment yükseltir
// (gorev_tanik SAYILMAZ) — bu yüzden çıktıyı bilinçle "takdir"e bağladık.

export const KANIT_ESIK = 3;
const HEDEF_BASINA_GOZLEMCI = 2; // her kanıtsız kişiye kaç akran gözlemci
const TUR_UST = 40; // tek çalıştırmada en fazla görev (flood koruması)

type Kisi = { id: string; full_name: string; team: string | null };

// Kişi başına kanıt sayısı (üç kaynak): ratings.comment + missions.ai_comment + kudos.
async function kanitSayilari(db: Db): Promise<Map<string, number>> {
  const [rcmt, mcmt, kud] = await Promise.all([
    db.from("ratings").select("target_id").eq("is_hidden", false).not("comment", "is", null),
    db.from("missions").select("participant_id").not("ai_comment", "is", null),
    db.from("kudos").select("to_id").eq("is_hidden", false),
  ]);
  const say = new Map<string, number>();
  const ekle = (id: string) => say.set(id, (say.get(id) ?? 0) + 1);
  (rcmt.data ?? []).forEach((r) => r.target_id && ekle(r.target_id));
  (mcmt.data ?? []).forEach((m) => m.participant_id && ekle(m.participant_id));
  (kud.data ?? []).forEach((k) => k.to_id && ekle(k.to_id));
  return say;
}

// Statik mikro-gözlem görev metni — AI yok (ucuz + güvenilir + ton kaçmaz).
function gozlemGorevi(hedefAd: string) {
  return {
    title: `${hedefAd}'i bugün gözle`,
    body:
      `Bugün **${hedefAd}**'in bir anını izle: bir kararını, birine nasıl davrandığını, ` +
      `zorlukta nasıl durduğunu. Onda gördüğün GERÇEK bir güçlü yanı fark et — uydurma, ` +
      `sadece gördüğünü. Sonra tek cümleyle bana yaz; ben bunu **${hedefAd}**'e isimsiz bir ` +
      `takdir olarak ileteceğim. Kim yazdığını asla bilmeyecek.`,
    neden: `${hedefAd}'in kampta görülmesine sen aracı oluyorsun.`,
    fayda:
      `Başkasının güçlü yanını fark edip adını koymak, bir liderin en sessiz ama en güçlü ` +
      `kasıdır — hem onu büyütür hem senin gözünü keskinleştirir.`,
  };
}

export type KanitGarantiSonuc = { kanitsiz: number; uretilen: number };

// Ana tarama + dağıtım. tik.ts Gün 2 akşam bloğundan (bayrak + tek-sefer kilit
// arkasında) çağrılır. Bekleyen görevi olan akrana yükleme yapmaz (görev yağmuru
// koruması). Zaten o hedefe atanmış açık gözlem görevi varsa tekrar üretmez.
export async function kanitGarantisiDagit(db: Db, simdi: Date): Promise<KanitGarantiSonuc> {
  const { data: kisilerHam } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("role", "participant");
  const kisiler = (kisilerHam ?? []) as Kisi[];
  if (kisiler.length === 0) return { kanitsiz: 0, uretilen: 0 };

  const say = await kanitSayilari(db);
  const kanitsizlar = kisiler.filter((k) => (say.get(k.id) ?? 0) < KANIT_ESIK);
  if (kanitsizlar.length === 0) return { kanitsiz: 0, uretilen: 0 };

  // Bekleyen görevi olan akranları hariç tut (yağmur koruması).
  const { data: bekleyenGorevler } = await db
    .from("missions")
    .select("participant_id, status")
    .in("status", ["pending", "submitted"]);
  const bekleyenSet = new Set((bekleyenGorevler ?? []).map((g) => g.participant_id));

  // Bu hedeflere daha önce (bu kampta) atanmış açık gözlem görevlerini bul —
  // tekrar üretme; ayrıca bir akran aynı hedefe iki kez atanmasın.
  const hedefIdler = kanitsizlar.map((k) => k.id);
  const { data: mevcutAtamalar } = await db
    .from("kanit_gorevi")
    .select("gozlemci_id, hedef_id")
    .in("hedef_id", hedefIdler);
  const hedefeAtanmisGozlemci = new Map<string, Set<string>>();
  for (const a of mevcutAtamalar ?? []) {
    const s = hedefeAtanmisGozlemci.get(a.hedef_id) ?? new Set<string>();
    s.add(a.gozlemci_id);
    hedefeAtanmisGozlemci.set(a.hedef_id, s);
  }

  // Akran yükünü dengele: bu turda kaç görev aldı say.
  const buTurYuk = new Map<string, number>();
  const dueAt = new Date(simdi.getTime() + 14 * 3_600_000).toISOString(); // ertesi sabaha dek

  let uretilen = 0;
  for (const hedef of kanitsizlar) {
    if (uretilen >= TUR_UST) break;
    const atanmis = hedefeAtanmisGozlemci.get(hedef.id) ?? new Set<string>();

    // Aday gözlemciler: hedef değil, aynı takımı yeğle, bekleyeni yok, daha önce
    // bu hedefe atanmamış, bu turda en az yük almış.
    const adaylar = kisiler
      .filter(
        (k) =>
          k.id !== hedef.id &&
          !bekleyenSet.has(k.id) &&
          !atanmis.has(k.id) &&
          (buTurYuk.get(k.id) ?? 0) < 2
      )
      .sort((a, b) => {
        // aynı takım önce
        const at = a.team === hedef.team ? 0 : 1;
        const bt = b.team === hedef.team ? 0 : 1;
        if (at !== bt) return at - bt;
        return (buTurYuk.get(a.id) ?? 0) - (buTurYuk.get(b.id) ?? 0);
      })
      .slice(0, HEDEF_BASINA_GOZLEMCI);

    const metin = gozlemGorevi(hedef.full_name);
    for (const gozlemci of adaylar) {
      if (uretilen >= TUR_UST) break;
      const { data: yeni, error } = await db
        .from("missions")
        .insert({
          participant_id: gozlemci.id,
          kind: "gozlem",
          title: metin.title,
          body: metin.body,
          difficulty: 1,
          neden: metin.neden,
          fayda: metin.fayda,
          issued_at: simdi.toISOString(),
          due_at: dueAt,
        })
        .select("id")
        .single();
      if (error || !yeni) continue;

      const { error: kayitHata } = await db.from("kanit_gorevi").insert({
        mission_id: yeni.id,
        gozlemci_id: gozlemci.id,
        hedef_id: hedef.id,
        hedef_ad: hedef.full_name,
      });
      if (kayitHata) {
        // yarış/çakışma → görevi geri al, akranı yormadan geç
        await db.from("missions").delete().eq("id", yeni.id);
        continue;
      }

      bekleyenSet.add(gozlemci.id); // aynı turda ikinci ağır görev verme
      buTurYuk.set(gozlemci.id, (buTurYuk.get(gozlemci.id) ?? 0) + 1);
      uretilen++;
      await katilimciyaBildir(
        db,
        gozlemci.id,
        `👁 AYNA'dan özel görev: ${metin.title}`,
        "Bir arkadaşını gözle, gördüğün güçlü yanı yaz — ben ona isimsiz ileteceğim.",
        "/gorevler"
      ).catch(() => {});
    }
  }

  return { kanitsiz: kanitsizlar.length, uretilen };
}
