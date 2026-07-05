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

  const [{ data: kisiler }, sidler, { data: kodSidAyar }] = await Promise.all([
    db.from("participants").select("id, full_name, team, phone, first_login_at").eq("role", "participant").order("full_name"),
    sablonSidleri(db),
    // "giris" artık tek-mesaj kod modu: gönderilebilirlik onaylı OTP kod
    // şablonunun (wa_tpl_kod) kayıtlı olmasına bağlı.
    db.from("settings").select("value").eq("key", "wa_tpl_kod").maybeSingle(),
  ]);

  const takimlar = [
    ...new Set((kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x)),
  ].sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0));

  const tumKisiler = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
    telefonVar: !!k.phone,
    girisYapti: !!k.first_login_at,
  }));

  const girisYapmamisSayisi = tumKisiler.filter((k) => !k.girisYapti && k.telefonVar).length;

  // sablonSidleri haritayı şablon anahtarıyla ("giris") döndürür, settings
  // anahtarıyla ("wa_tpl_giris") değil — doğru anahtarla eriş.
  const kayitliAnahtarlar = (["giris", "giris_hatirlatma"] as const)
    .filter((a) => !!sidler[a]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🔑 Giriş Daveti Gönder</h1>
        <p className="mt-1 text-sm text-slate-400">
          Katılımcılara WhatsApp üzerinden kişiye özel giriş bağlantısı ve şifre gönder.
        </p>
        <div className="mt-3 flex gap-3 text-xs">
          <span className="rounded-full bg-midnight-card/60 px-3 py-1.5 text-slate-300 ring-1 ring-royal/20">
            👤 Toplam: {tumKisiler.length}
          </span>
          <span className={`rounded-full px-3 py-1.5 ring-1 ${girisYapmamisSayisi > 0 ? "bg-amber-400/10 text-amber-300 ring-amber-400/20" : "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"}`}>
            {girisYapmamisSayisi > 0 ? `⚠ ${girisYapmamisSayisi} kişi henüz giriş yapmadı` : "✓ Herkes giriş yaptı"}
          </span>
        </div>
      </div>

      <Katlanir baslik="WhatsApp Giriş Daveti" ikon="💬" varsayilanAcik>
        <WhatsAppGonder
          yapilandirildi={yapilandirildi}
          takimlar={takimlar}
          kisiler={tumKisiler}
          odevYapmayanSayisi={0}
          girisYapmamisSayisi={girisYapmamisSayisi}
          telefonsuz={tumKisiler.filter((k) => !k.telefonVar).length}
          kayitliAnahtarlar={kayitliAnahtarlar}
          sadeceSablonlar={["giris", "giris_hatirlatma"]}
          kodKayitli={!!kodSidAyar?.value}
        />
      </Katlanir>
    </main>
  );
}
