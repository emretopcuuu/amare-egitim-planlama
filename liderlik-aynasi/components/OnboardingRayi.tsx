import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import TelefonaGecKoprusu from "@/components/TelefonaGecKoprusu";

// ONBOARDING RAYI — kamp öncesi TÜM 6 fazı (+ Kamp) tek bakışta gösteren,
// her sayfada (ana sayfa + her fazın içinde) görünen kalıcı harita.
// KURAL: bitirdiğin bir faza tıklayıp geri dönebilirsin (özet/görüntüleme
// ekranına gider); henüz açmadığın faza İLERİ atlayamazsın (tıklanamaz,
// üstüne gelince "önce X'i bitir" notu). Ritüel'in kendi rotası yok —
// tamamlandığında ✓ görünür ama tıklanamaz (özel durum, bkz. yorum aşağıda).
type FazDurum = "tamam" | "simdi" | "kilitli";
type FazNode = { ad: string; kisaAd: string; href: string | null; durum: FazDurum };

const FAZ_ADLARI = ["Ritüel", "Oyun", "Değerler", "Pusula", "Hedef", "Farkındalık", "Kamp"] as const;
// [UX4] Faz başına tahmini süre (dk) — bilinmezlik yarıda bırakmanın 1 numaralı
// sebebi. "Kamp" için süre anlamsız (0 = gösterme).
const FAZ_SURE_DK = [3, 1, 15, 10, 8, 5, 0] as const;

// Şu anki faz DB'deki tamamlanma durumundan kendiliğinden hesaplanır (bir
// önceki tamamlanan faz gerçekleşince rail otomatik ilerler) — çağıran
// sayfanın hangi fazda olduğunu ayrıca belirtmesine gerek yok.
export default async function OnboardingRayi() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return null;

  const db = supabaseAdmin();
  const [{ data: kisi }, { data: sesVarRow }, { data: degerlerDurum }, { data: pusulaDurum }, { data: hedefDurum }, { data: ofDurum }] =
    await Promise.all([
      db.from("participants").select("team, camp_unlocked_at").eq("id", session.sub).maybeSingle(),
      db.from("voice_profiles").select("participant_id").eq("participant_id", session.sub).maybeSingle(),
      db.from("degerler_calismasi").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      db.from("pusula").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      db.from("hedef").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
    ]);

  const tamamlar = [
    !!sesVarRow, // Ritüel
    !!kisi?.team, // Oyun Seçimi
    !!degerlerDurum?.tamamlandi_at, // Değerler
    !!pusulaDurum?.tamamlandi_at, // Pusula
    !!hedefDurum?.tamamlandi_at, // Hedef
    !!ofDurum?.tamamlandi_at, // Ön Farkındalık
    !!kisi?.camp_unlocked_at, // Kamp
  ];
  // Şu anki faz: ilk tamamlanmamış olan (ya da hepsi bittiyse Kamp).
  // NOT: eskiden Math.max(ilkEksik, length-1) kullanılıyordu — length-1 sabiti
  // ilk eksik indeksten hep büyük/eşit olduğundan sonuç HER ZAMAN son indekse
  // (Kamp) eşitleniyordu, gerçek ilerleme hiç yansımıyordu (bkz. doğru desen:
  // YolculukHaritasi.tsx).
  const ilkEksik = tamamlar.findIndex((t) => !t);
  const suankiIndeks = ilkEksik === -1 ? tamamlar.length - 1 : ilkEksik;

  // Ritüel'in kendi sayfası yok (ana sayfada inline render edilir); tamamlandığında
  // görüntülenecek en yakın karşılığı kişisel yansıma videosu — o da hazır olmayabilir.
  // Bu yüzden Ritüel HER ZAMAN tıklanamaz (basit ve şaşırtmayan davranış).
  const HREFLER: (string | null)[] = [null, "/oyun-secimi", "/degerler", "/pusula", "/hedef", "/on-farkindalik", null];

  const nodelar: FazNode[] = FAZ_ADLARI.map((ad, i) => ({
    ad,
    kisaAd: ad,
    href: i <= suankiIndeks ? HREFLER[i] : null,
    durum: i < suankiIndeks ? "tamam" : i === suankiIndeks ? "simdi" : "kilitli",
  }));

  // [UX9] Dönüş bağlamı: "neredesin + ne kadar kaldı" tek satırda. Kalan süre =
  // tamamlanmamış fazların süre toplamı (Kamp hariç).
  const kalanDk = tamamlar.reduce(
    (t, tamam, i) => t + (!tamam && FAZ_SURE_DK[i] > 0 ? FAZ_SURE_DK[i] : 0),
    0
  );
  const suankiAd = FAZ_ADLARI[suankiIndeks];
  const suankiSure = FAZ_SURE_DK[suankiIndeks];

  return (
    <div className="mx-auto w-full max-w-md">
    <nav
      aria-label="Onboarding yolculuğu"
      className="flex w-full items-stretch gap-1 px-1 py-2"
    >
      {nodelar.map((n, i) => {
        const tiklanabilir = n.durum === "tamam" && !!n.href;
        const icerik = (
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : n.durum !== "kilitli" ? "bg-emerald-500/50" : "bg-white/10"}`}
              />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold ${
                  n.durum === "tamam"
                    ? "bg-emerald-500 text-[#1a1206]"
                    : n.durum === "simdi"
                      ? "bg-gold text-[#1a1206] ring-2 ring-gold/40"
                      : "bg-midnight-soft text-slate-500"
                }`}
              >
                {n.durum === "tamam" ? "✓" : i + 1}
              </span>
              <span
                className={`h-0.5 flex-1 ${i === nodelar.length - 1 ? "opacity-0" : n.durum === "tamam" ? "bg-emerald-500/50" : "bg-white/10"}`}
              />
            </div>
            <span
              className={`mt-1 line-clamp-1 text-center text-[0.58rem] leading-tight ${
                n.durum === "simdi" ? "font-semibold text-gold-light" : n.durum === "tamam" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {n.kisaAd}
            </span>
          </div>
        );
        if (tiklanabilir) {
          return (
            <Link key={n.ad} href={n.href!} className="flex min-w-0 flex-1" aria-current={n.durum === "simdi" ? "step" : undefined}>
              {icerik}
            </Link>
          );
        }
        return (
          <div
            key={n.ad}
            className="flex min-w-0 flex-1"
            title={n.durum === "kilitli" ? "Önce önceki fazları bitirmelisin" : undefined}
            aria-current={n.durum === "simdi" ? "step" : undefined}
          >
            {icerik}
          </div>
        );
      })}
    </nav>
    {/* [UX4/UX9] Konum + süre bağlamı — dönen kişi nereye ışınlandığını anlar */}
    {kalanDk > 0 && suankiIndeks < tamamlar.length - 1 && (
      <p className="pb-1 text-center text-[0.65rem] font-medium text-slate-500">
        Sıradaki: <span className="text-gold-light">{suankiAd}</span>
        {suankiSure > 0 && ` (~${suankiSure} dk)`} · toplam ~{kalanDk} dk kaldı
      </p>
    )}
    {/* [UX6] Bilgisayardan girene telefona geçiş QR'ı (yalnız masaüstünde görünür) */}
    <div className="mt-2">
      <TelefonaGecKoprusu />
    </div>
    </div>
  );
}
