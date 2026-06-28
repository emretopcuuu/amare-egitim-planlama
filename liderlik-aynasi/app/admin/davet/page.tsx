import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { whatsAppYapilandirildiMi, sablonSidleri } from "@/lib/whatsapp";
import Katlanir from "../Katlanir";
import WhatsAppGonder from "../whatsapp/WhatsAppGonder";

export const metadata = { title: "Giriş Daveti Gönder — Liderlik Aynası" };

export default async function DavetPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const yapilandirildi = whatsAppYapilandirildiMi();

  const [{ data: kisiler }, sidler] = await Promise.all([
    db.from("participants").select("id, full_name, team, phone").eq("role", "participant").order("full_name"),
    sablonSidleri(db),
  ]);

  const takimlar = [
    ...new Set((kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x)),
  ].sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0));

  const tumKisiler = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
    telefonVar: !!k.phone,
  }));

  const kayitliAnahtarlar = ["giris"].filter(() => !!sidler["wa_tpl_giris"]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🔑 Giriş Daveti Gönder</h1>
        <p className="mt-1 text-sm text-slate-400">
          Katılımcılara WhatsApp üzerinden kişiye özel giriş bağlantısı ve şifre gönder.
        </p>
      </div>

      <Katlanir baslik="WhatsApp Giriş Daveti" ikon="💬" varsayilanAcik>
        <WhatsAppGonder
          yapilandirildi={yapilandirildi}
          takimlar={takimlar}
          kisiler={tumKisiler}
          odevYapmayanSayisi={0}
          telefonsuz={tumKisiler.filter((k) => !k.telefonVar).length}
          kayitliAnahtarlar={kayitliAnahtarlar}
          sadeceSablonlar={["giris"]}
        />
      </Katlanir>
    </main>
  );
}
