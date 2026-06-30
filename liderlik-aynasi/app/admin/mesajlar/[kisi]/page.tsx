import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import SohbetKutusu from "@/components/SohbetKutusu";
import { adminKisiSohbeti } from "@/lib/icMesaj";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesaj — Liderlik Aynası" };

// Yönetim ↔ bir katılımcı sohbeti (admin görünümü). Açınca kişinin yönetime
// yazdıkları okundu işaretlenir; admin buradan cevap yazar (katılımcıya bildirim).
export default async function AdminSohbetPage({
  params,
}: {
  params: Promise<{ kisi: string }>;
}) {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  const { kisi } = await params;
  const db = supabaseAdmin();

  const { data: kisiVeri } = await db
    .from("participants")
    .select("full_name, team, role")
    .eq("id", kisi)
    .maybeSingle();
  if (!kisiVeri || kisiVeri.role !== "participant") notFound();

  const mesajlar = await adminKisiSohbeti(db, kisi);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-5">
      <div className="mb-3">
        <Link href="/admin/mesajlar" className="text-sm font-semibold text-gold-light">
          ← Ekip Mesajları
        </Link>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">{kisiVeri.full_name}</h1>
        {kisiVeri.team && (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">
            {kisiVeri.team}
          </span>
        )}
      </div>
      <SohbetKutusu
        benId={session.sub}
        mod="admin"
        anahtar={kisi}
        digerAd={kisiVeri.full_name}
        baslangic={mesajlar}
      />
    </main>
  );
}
