import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import OyunBayrakPanel, { type Bayrak } from "./OyunBayrakPanel";

export const metadata = { title: "Oyunlaştırma — Yönetim" };
export const dynamic = "force-dynamic";

// Oyunlaştırma mekaniklerinin merkezi bayrak panosu. Hepsi varsayılan KAPALI;
// kamp günü buradan (ya da senaryo satırıyla) açılır.
const BAYRAKLAR: { key: string; ad: string; aciklama: string }[] = [
  { key: "market_acik", ad: "🏪 Kıvılcım Marketi", aciklama: "Katılımcılar kıvılcım cüzdanını harcayabilir (5 reyon)." },
  { key: "sandik_acik", ad: "🎁 Gizemli Sandık", aciklama: "Her 3 puanlanan görevde bir sandık hakkı doğar." },
  { key: "rekorlar_acik", ad: "🏆 Rekorlar", aciklama: "12 kategoride kişisel + kamp rekorları; kırılınca herkese push." },
  { key: "cift_serisi_acik", ad: "🔥 Çift Serisi", aciklama: "Kamp arkadaşı grubu aynı gün beslerse ortak alev büyür (kül→yeniden doğuş)." },
  { key: "fisilti_acik", ad: "🔒 Fısıltı Postası", aciklama: "Günde 1 sesli takdir; alıcı görev tamamlayınca açılır; anonimde tahmin oyunu (KVKK: gerçek ses)." },
  { key: "hamle_acik", ad: "♟ Hamle Sırası", aciklama: "Eşleşmeli görevde karşılıklılık + kilitli reveal; ikisi de yazınca açılır." },
];

export default async function OyunlastirmaPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", BAYRAKLAR.map((b) => b.key));
  const durum = new Map((data ?? []).map((s) => [s.key, s.value === "true"]));
  const bayraklar: Bayrak[] = BAYRAKLAR.map((b) => ({ ...b, acik: durum.get(b.key) ?? false }));

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🎮 Oyunlaştırma Kontrol</h1>
        <p className="mt-1 text-sm text-slate-400">
          Oyunlaştırma mekanikleri. Hepsi varsayılan kapalı — kamp günü aç. Kapalıyken katılımcı
          hiçbir şey görmez (mevcut akış birebir korunur).
        </p>
      </div>
      <OyunBayrakPanel bayraklar={bayraklar} />
    </main>
  );
}
