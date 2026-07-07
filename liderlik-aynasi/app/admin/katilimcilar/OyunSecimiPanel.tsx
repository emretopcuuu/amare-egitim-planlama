import { supabaseAdmin } from "@/lib/supabase/server";
import { oyunKombolari, grupNoCozumle, OYUN_BILGI } from "@/lib/cumartesiProgrami";
import Katlanir from "../Katlanir";
import GrupPanosu, { type PanoUye, type PanoKombo } from "./GrupPanosu";

// Admin: oyun seçimi ile dağıtım paneli. Kim hangi grupta — isim isim — görünür
// ve sürükle-bırak (mobilde dokun-taşı) ile kişiler gruplar arasında taşınır.
// Kombinasyonlar CUMARTESI_PROGRAMI'ndan türetilir.
export default async function OyunSecimiPanel() {
  const db = supabaseAdmin();
  const { data: kisiler } = await db
    .from("participants")
    .select("id, full_name, team, profil_foto_path")
    .eq("role", "participant");

  const uyeler: PanoUye[] = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    grup: grupNoCozumle(k.team),
  }));
  const toplam = uyeler.length;
  const atanmamis = uyeler.filter((u) => u.grup == null).length;

  // Minik fotoğraflar (imzalı URL, sesler bucket, tek batch) → daha iyi gözlem.
  const fotoUrller: Record<string, string> = {};
  const fotolular = (kisiler ?? []).filter((k) => k.profil_foto_path);
  if (fotolular.length > 0) {
    const yollar = fotolular.map((k) => k.profil_foto_path as string);
    const { data: imzali } = await db.storage.from("sesler").createSignedUrls(yollar, 3600);
    const yolUrl = new Map((imzali ?? []).map((s) => [s.path, s.signedUrl]));
    for (const k of fotolular) {
      const url = yolUrl.get(k.profil_foto_path as string);
      if (url) fotoUrller[k.id] = url;
    }
  }

  const kombolar: PanoKombo[] = oyunKombolari().map((k) => ({
    etiket: `Bowling + ${k.oyunlar.map((o) => `${OYUN_BILGI[o].simge} ${OYUN_BILGI[o].ad}`).join(" + ")}`,
    gruplar: k.gruplar,
  }));

  return (
    <Katlanir
      baslik="Oyun Seçimi ile Dağıtım"
      aciklama="Bowling herkes · diğer 3'ten 2 seçim → uygun gruba otomatik atama"
      ikon="🎲"
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-400">
          Grubu olmayan her katılımcı girişte 2 oyun seçer ve o ikiliyi oynayan
          gruplardan en boş olanına atanır. Aşağıda kim hangi grupta görünür;
          sürükle-bırakla (mobilde dokunup “Buraya taşı”) elle değiştirebilirsin.
          Toplam <span className="font-semibold text-slate-200">{toplam}</span> kişi ·{" "}
          <span className="font-semibold text-amber-300">{atanmamis}</span> henüz atanmadı.
        </p>

        <GrupPanosu uyeler={uyeler} kombolar={kombolar} fotoUrller={fotoUrller} />
      </div>
    </Katlanir>
  );
}
