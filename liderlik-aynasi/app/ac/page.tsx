import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;

// Oda QR açılışı: kampa fiziksel giriş anı. QR, kamp_kilit_kodu'nu taşır;
// doğruysa oturum sahibinin camp_unlocked_at'i mühürlenir → sistem devamlılığı
// başlar. Boş kod = kilit yapılandırılmamış, açma reddedilir.
//
// NOT: Oturumsuz gelen (QR'ı giriş yapılmamış tarayıcıda açan) kişi proxy
// tarafından /giris?next=/ac?k=… adresine gönderilir; kod girince buraya döner.
// Bu yüzden burada başarı/zaten-açık durumlarını AÇIKÇA gösteririz — sessiz
// yönlendirme "hiçbir şey olmadı / mühür kalkmadı" hissi veriyordu.
export default async function AcSayfa({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const { k } = await searchParams;
  const db = supabaseAdmin();
  const [{ data: kilit }, { data: kisi }] = await Promise.all([
    db.from("settings").select("value").eq("key", "kamp_kilit_kodu").maybeSingle(),
    db.from("participants").select("camp_unlocked_at").eq("id", session.sub).maybeSingle(),
  ]);
  const dogruKod = (kilit?.value ?? "").trim();
  const verilenKod = (k ?? "").trim();

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

  // Kod doğruysa mührü kaldır ve başarı ekranı göster.
  if (dogruKod && verilenKod && verilenKod.toLowerCase() === dogruKod.toLowerCase()) {
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
      />
    );
  }

  // Kod yok / yanlış → hata ekranı.
  return (
    <Sonuc ikon="🔒" baslik={t.acHataBaslik} metin={t.acHataMetin} dugme={tr.degerlendir.anaSayfayaDon} />
  );
}

function Sonuc({
  ikon,
  baslik,
  metin,
  dugme,
}: {
  ikon: string;
  baslik: string;
  metin: string;
  dugme: string;
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
          href="/"
          className="btn-kor parilti mt-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold"
        >
          {dugme}
        </Link>
      </div>
    </main>
  );
}
