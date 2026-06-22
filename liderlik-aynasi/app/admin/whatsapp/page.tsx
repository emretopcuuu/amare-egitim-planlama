import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import { WA_SABLONLAR } from "@/lib/whatsappSablonlari";
import { whatsAppYapilandirildiMi, sablonSidleri } from "@/lib/whatsapp";
import WhatsAppGonder from "./WhatsAppGonder";

export const metadata = { title: "WhatsApp — Liderlik Aynası" };

const t = tr.admin.whatsapp;

// PD101 WhatsApp gönderim merkezi: giriş daveti (link + şifre), görev hatırlatma
// (ödev yapmayanlar) ve serbest duyuru. Hedef: genel / takım / kişi / ödev yapmayan.
export default async function WhatsAppPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const yapilandirildi = whatsAppYapilandirildiMi();

  const [{ data: kisiler }, { data: bekleyen }, sidler] = await Promise.all([
    db.from("participants").select("id, full_name, team, phone").eq("role", "participant"),
    db.from("missions").select("participant_id").eq("status", "pending"),
    sablonSidleri(db),
  ]);

  const tumKisiler = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
    telefonVar: !!k.phone,
  }));
  const takimlar = [...new Set(tumKisiler.map((k) => k.takim).filter((x): x is string => !!x))].sort(
    (a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0)
  );
  const odevYapmayanSayisi = new Set((bekleyen ?? []).map((m) => m.participant_id)).size;
  const telefonsuz = tumKisiler.filter((k) => !k.telefonVar).length;

  // Hangi şablonlar Twilio'ya kaydedilip onaylandı (ContentSid var mı).
  const kayitliAnahtarlar = WA_SABLONLAR.filter((s) => sidler[s.anahtar]).map((s) => s.anahtar);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      {!yapilandirildi && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">{t.kurulumBaslik}</p>
          <p className="mt-1 whitespace-pre-line text-amber-100/80">{t.kurulumAciklama}</p>
        </div>
      )}

      {yapilandirildi && kayitliAnahtarlar.length < WA_SABLONLAR.length && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-200">
          <p className="font-semibold">{t.onayBaslik}</p>
          <p className="mt-1 whitespace-pre-line text-sky-100/80">{t.onayAciklama}</p>
        </div>
      )}

      <WhatsAppGonder
        yapilandirildi={yapilandirildi}
        takimlar={takimlar}
        kisiler={tumKisiler}
        odevYapmayanSayisi={odevYapmayanSayisi}
        telefonsuz={telefonsuz}
        kayitliAnahtarlar={kayitliAnahtarlar}
      />
    </main>
  );
}
