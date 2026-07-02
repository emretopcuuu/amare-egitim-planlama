import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import GorevAkisiTablo from "./GorevAkisiTablo";

export const metadata = { title: "Tüm Görevler — Liderlik Aynası" };

// Kampın TÜM görev akışı: ilk görevden sona, kişiye göre arama + kişi/gün-saat/
// puan/durum/tür başlıklarıyla sıralama. AYNA Direktörü'ndeki "Son Görevler"
// kartı bunun son 20'lik özetidir; tam liste burada.
export default async function GorevAkisiPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: gorevler, error }, baslangic] = await Promise.all([
    db
      .from("missions")
      .select(
        "id, kind, title, body, status, ai_score, spark_points, difficulty, issued_at, trait:traits(name), katilimci:participants!missions_participant_id_fkey(full_name)"
      )
      .order("issued_at", { ascending: false })
      .limit(5000),
    kampBaslangicGetir(db),
  ]);
  if (error) throw error;

  const satirlar = (gorevler ?? []).map((g) => ({
    id: g.id,
    kisi: g.katilimci?.full_name ?? "—",
    baslik: g.title,
    tur: g.kind,
    durum: g.status,
    puan: g.ai_score,
    kivilcim: g.spark_points ?? 0,
    govde: g.body,
    zorluk: g.difficulty,
    ozellik: g.trait?.name ?? null,
    tarih: g.issued_at,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
      {/* Katı koyu kart: gündüz temasında arka plan fotoğrafı yazının altından
          sızıp okunurluğu bozmasın (koyu-alan = bölgeyi zorla koyu işler). */}
      <div className="koyu-alan space-y-4 rounded-2xl bg-midnight-card/95 p-4 shadow-xl ring-1 ring-royal/30 backdrop-blur sm:p-6">
        <Link href="/admin/ayna-direktoru" className="text-sm text-royal-light hover:underline">
          ← AYNA Direktörü
        </Link>
        <GorevAkisiTablo gorevler={satirlar} baslangic={baslangic ?? null} />
      </div>
    </main>
  );
}
