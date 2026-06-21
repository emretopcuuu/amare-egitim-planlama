import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// CANLI TAZELEME imzası: ana sayfa bir SUNUCU durum makinesidir ve yalnızca
// yüklemede okunur. Admin bir dalga/rapor/boşluk/mühür açtığında açık duran
// telefonların haberi olmaz — herkesin elle yenilemesi gerekirdi. Bu uç,
// kişinin "akışını" değiştirebilecek HER ŞEYİ tek bir kısa imzaya sıkıştırır;
// istemci bu imzayı 12 sn'de bir yoklar, değişince router.refresh() çağırır.
//
// İmza DEĞERLERDEN üretilir (settings.updated_at'e GÜVENİLMEZ — bazı yazışlar
// onu güncellemiyor). Böylece bayrak değeri değiştiği an imza da değişir.
const ANAHTARLAR = [
  "pusula_acik",
  "on_farkindalik_acik",
  "oyun_secimi_acik",
  "reports_visible",
  "bosluk_acik",
  "kapanis_soz_acik",
  "kamp_kilit_kodu",
  "sonraki_dalga_zamani",
  "gunun_cumlesi",
  "prova_modu",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yok" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const [{ data: dalga }, { data: ayarlar }, { data: kisi }, { count: gorev }] =
    await Promise.all([
      db
        .from("waves")
        .select("id")
        .eq("is_open", true)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("settings").select("key, value").in("key", ANAHTARLAR as unknown as string[]),
      db
        .from("participants")
        .select("camp_unlocked_at, team")
        .eq("id", session.sub)
        .maybeSingle(),
      db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", session.sub)
        .eq("status", "pending"),
    ]);

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  // Bayrakları SABİT sırayla diz → aynı durum her zaman aynı imza.
  const bayrak = ANAHTARLAR.map((k) => `${k}=${ayar.get(k) ?? ""}`).join(";");
  const imza = [
    `w:${dalga?.id ?? 0}`,
    `f:${bayrak}`,
    `m:${kisi?.camp_unlocked_at ? 1 : 0}:${kisi?.team ?? ""}:${gorev ?? 0}`,
  ].join("|");

  return Response.json({ s: imza });
}
