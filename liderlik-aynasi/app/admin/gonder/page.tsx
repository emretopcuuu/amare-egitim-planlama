import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import { WA_SABLONLAR } from "@/lib/whatsappSablonlari";
import { whatsAppYapilandirildiMi, sablonSidleri } from "@/lib/whatsapp";
import Katlanir from "../Katlanir";
import SonGonderimler from "./SonGonderimler";
import DuyuruGonder from "../duyuru/DuyuruGonder";
import DuyuruSablonlari from "../DuyuruSablonlari";
import WhatsAppGonder from "../whatsapp/WhatsAppGonder";

export const metadata = { title: "Mesaj Gönder — Liderlik Aynası" };

// S4: Duyuru + WhatsApp tek sayfada birleşti. Kanal seçimi içeride.
export default async function GonderPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const yapilandirildi = whatsAppYapilandirildiMi();

  const [{ data: kisiler }, { data: bekleyen }, sidler] = await Promise.all([
    db.from("participants").select("id, full_name, team, phone").eq("role", "participant"),
    db.from("missions").select("participant_id").eq("status", "pending"),
    sablonSidleri(db),
  ]);

  const takimlar = [
    ...new Set(
      (kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x)
    ),
  ].sort(
    (a, b) =>
      (parseInt(a.replace(/\D/g, ""), 10) || 0) -
      (parseInt(b.replace(/\D/g, ""), 10) || 0)
  );

  const tumKisiler = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
    telefonVar: !!k.phone,
  }));
  const odevYapmayanSayisi = new Set(
    (bekleyen ?? []).map((m) => m.participant_id)
  ).size;
  const telefonsuz = tumKisiler.filter((k) => !k.telefonVar).length;
  const kayitliAnahtarlar = WA_SABLONLAR.filter((s) => sidler[s.anahtar]).map(
    (s) => s.anahtar
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">📢 Mesaj Gönder</h1>
        <p className="mt-1 text-sm text-slate-400">
          Uygulama bildirimi veya WhatsApp — tüm yayın kanalları bir arada.
        </p>
      </div>

      {/* [ADMIN-UX8] "az önce ne gönderdim?" — çift gönderme korkusuna son */}
      <SonGonderimler />

      <Katlanir baslik={tr.admin.yayin.baslik} ikon="🔔" varsayilanAcik>
        <DuyuruGonder takimlar={takimlar} kisiler={tumKisiler} />
        <div className="mt-4 border-t border-white/10 pt-4">
          <DuyuruSablonlari />
        </div>
      </Katlanir>

      <Katlanir baslik={tr.admin.whatsapp.baslik} ikon="💬">
        {!yapilandirildi && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <p className="font-semibold">{tr.admin.whatsapp.kurulumBaslik}</p>
            <p className="mt-1 whitespace-pre-line text-amber-100/80">
              {tr.admin.whatsapp.kurulumAciklama}
            </p>
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
      </Katlanir>
    </main>
  );
}
