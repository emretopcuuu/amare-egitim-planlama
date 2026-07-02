import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import {
  karakterVideosuBaslat,
  yansimaVideosuBaslat,
  higgsYapilandirildiMi,
} from "@/lib/higgs";

type Db = ReturnType<typeof supabaseAdmin>;

const ACI_SIRA = ["duz", "sag", "sol"]; // referansta önce cepheden
// Bilinmeyen açı (ör. "ekstra" — kişinin eklediği ek fotoğraflar) sırayı
// bozmasın diye zorunlu 3 açının HER ZAMAN arkasına sıralanır.
function aciSirasi(aci: string): number {
  const i = ACI_SIRA.indexOf(aci);
  return i === -1 ? ACI_SIRA.length : i;
}
const IMZA_OMRU = 3600;

export type YuzKare = { aci: string; path: string };

export type KarakterReferans = {
  selfiePath: string | null;
  kareler: YuzKare[]; // sıralı: düz, sağ, sol
  yedekPath: string | null; // ses ritüeli tek fotoğrafı (eski hat)
  tam: boolean; // selfie + 3 kare hazır
};

// Bir katılımcının video referans setini toplar (Canlı Ayna kareleri + selfie,
// yoksa eski ses-ritüeli fotoğrafı).
export async function karakterReferans(db: Db, pid: string): Promise<KarakterReferans> {
  const [{ data: kisi }, { data: vp }] = await Promise.all([
    db
      .from("participants")
      .select("profil_foto_path, yuz_fotolari")
      .eq("id", pid)
      .maybeSingle(),
    db
      .from("voice_profiles")
      .select("photo_path, face_path")
      .eq("participant_id", pid)
      .maybeSingle(),
  ]);

  const ham = Array.isArray(kisi?.yuz_fotolari) ? (kisi!.yuz_fotolari as YuzKare[]) : [];
  const kareler = ham
    .filter((k) => k && typeof k.path === "string")
    .slice()
    .sort((a, b) => aciSirasi(a.aci) - aciSirasi(b.aci));

  return {
    selfiePath: kisi?.profil_foto_path ?? null,
    kareler,
    yedekPath: vp?.photo_path ?? vp?.face_path ?? null,
    tam: !!kisi?.profil_foto_path && kareler.length >= 3,
  };
}

async function imzala(db: Db, yol: string): Promise<string | null> {
  const { data } = await db.storage.from("sesler").createSignedUrl(yol, IMZA_OMRU);
  return data?.signedUrl ?? null;
}

// Üretim girdisi: çoklu referans (kareler + selfie) ve tek-foto yedek URL'si.
async function uretimGirdisi(
  db: Db,
  pid: string
): Promise<{ coklu: string[]; tek: string | null }> {
  const ref = await karakterReferans(db, pid);
  const yollar = [...ref.kareler.map((k) => k.path)];
  if (ref.selfiePath) yollar.push(ref.selfiePath);

  const imzalilar = await Promise.all(yollar.map((y) => imzala(db, y)));
  const coklu = imzalilar.filter((u): u is string => !!u);

  // Tek-foto yedeği: önce cephe karesi, sonra selfie, sonra eski ritüel fotoğrafı.
  const tekYol =
    ref.kareler.find((k) => k.aci === "duz")?.path ?? ref.selfiePath ?? ref.yedekPath;
  const tek = tekYol ? await imzala(db, tekYol) : null;

  return { coklu, tek };
}

export type UretimSonuc = "uretiliyor" | "hata" | "girdi_yok" | "yapilandirilmadi";

// Bir katılımcı için video üretimini başlatır: çoklu referans (yenisi asıl),
// olmazsa tek-foto (eski yedek). voice_profiles satırını upsert eder.
export async function karakterUretimBaslat(db: Db, pid: string): Promise<UretimSonuc> {
  if (!higgsYapilandirildiMi()) return "yapilandirilmadi";

  const { coklu, tek } = await uretimGirdisi(db, pid);
  if (coklu.length === 0 && !tek) {
    // Girdi yok: 'hata'ya çek ki tik bu satırı her turda yeniden denemesin.
    await db
      .from("voice_profiles")
      .upsert({ participant_id: pid, video_status: "hata" }, { onConflict: "participant_id" });
    return "girdi_yok";
  }

  let istek = await karakterVideosuBaslat(coklu);
  if (!istek && tek) istek = await yansimaVideosuBaslat(tek); // zarif düşüş

  await db.from("voice_profiles").upsert(
    {
      participant_id: pid,
      video_status: istek ? "uretiliyor" : "hata",
      video_request_id: istek ?? null,
    },
    { onConflict: "participant_id" }
  );

  return istek ? "uretiliyor" : "hata";
}
