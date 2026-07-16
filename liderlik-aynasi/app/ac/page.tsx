import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;

// Kamp açma: kampa fiziksel giriş anı. İki yol var:
//  • ?u=<token>  → KİŞİSEL açma QR'ı (yaka kartındaki). Jeton bir kişiye aittir;
//    yalnız o kişi (kendi oturumuyla) kendi kampını açabilir. Başkasının QR'ı
//    reddedilir → "kendi QR'ıyla sadece kendi kampını açar".
//  • ?k=<kod>    → ortak oda kodu (kamp_kilit_kodu) — görevli yedeği.
// Giriş ayrı 6 haneli kodla (şifre) yapılır; QR yalnız "kampı aç" işlevi taşır.
//
// NOT: Oturumsuz gelen (QR'ı giriş yapılmamış tarayıcıda açan) kişi proxy
// tarafından /giris?next=/ac?u=… adresine gönderilir; kod girince buraya döner.
export default async function AcSayfa({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; u?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const { k, u } = await searchParams;
  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("camp_unlocked_at, camp_unlock_token")
    .eq("id", session.sub)
    .maybeSingle();

  // Zaten açıksa: tekrar yazma, ama net bir onay göster (kafa karışmasın).
  if (kisi?.camp_unlocked_at) {
    return (
      <Sonuc
        ikon="🔓"
        baslik={t.acZatenBaslik}
        metin={t.acZatenMetin}
        dugme={t.acBasariDugme}
      />
    );
  }

  const verilenToken = (u ?? "").trim();
  const verilenKod = (k ?? "").trim();

  let acabilir = false;

  // 1) Kişisel açma QR'ı: jeton oturum sahibinin kendi jetonuyla eşleşmeli.
  //    Başkasının QR'ı (jeton ≠ kendi) "bu QR sana ait değil" ile reddedilir.
  if (verilenToken) {
    if (kisi?.camp_unlock_token && verilenToken === kisi.camp_unlock_token) {
      acabilir = true;
    } else {
      return (
        <Sonuc
          ikon="🔒"
          baslik={t.acYabanciBaslik}
          metin={t.acYabanciMetin}
          dugme={tr.degerlendir.anaSayfayaDon}
        />
      );
    }
  }

  // 2) Ortak oda kodu (görevli yedeği) — kamp_kilit_kodu ile eşleşirse.
  if (!acabilir && verilenKod) {
    const { data: kilit } = await db
      .from("settings")
      .select("value")
      .eq("key", "kamp_kilit_kodu")
      .maybeSingle();
    const dogruKod = (kilit?.value ?? "").trim();
    if (dogruKod && verilenKod.toLowerCase() === dogruKod.toLowerCase()) {
      acabilir = true;
    }
  }

  if (acabilir) {
    await db
      .from("participants")
      .update({ camp_unlocked_at: new Date().toISOString() })
      .eq("id", session.sub)
      .is("camp_unlocked_at", null);
    return (
      <Sonuc
        ikon="🔓"
        baslik={t.acBasariBaslik}
        metin={t.acBasariMetin}
        dugme={t.acBasariDugme}
        dugmeHref="/ayna-hayalleri"
      />
    );
  }

  // Kod/jeton yok ya da geçersiz → hata ekranı.
  return (
    <Sonuc ikon="🔒" baslik={t.acHataBaslik} metin={t.acHataMetin} dugme={tr.degerlendir.anaSayfayaDon} />
  );
}

function Sonuc({
  ikon,
  baslik,
  metin,
  dugme,
  dugmeHref = "/",
}: {
  ikon: string;
  baslik: string;
  metin: string;
  dugme: string;
  dugmeHref?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="kart-cam max-w-md rounded-3xl p-10">
        <p className="text-5xl" aria-hidden>
          {ikon}
        </p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{baslik}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{metin}</p>
        <Link
          href={dugmeHref}
          className="btn-kor parilti mt-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold"
        >
          {dugme}
        </Link>
      </div>
    </main>
  );
}
