import Link from "next/link";

// [M6] ÖN KOŞUL KAPISI — bir onboarding adımına sırası gelmeden (örn. Değerler
// bitmeden doğrudan /pusula veya /hedef linkine) girildiğinde SESSİZ redirect
// yerine nazik bir yönlendirme ekranı. Normal akıştaki kişi bunu HİÇ görmez
// (ana sayfa yönlendiricisi zaten önce Değerler'e gönderir); yalnız derin-linkle
// sıranın dışına düşen kişi görür.
export default function OnKosulKapisi({
  ikon = "🧭",
  baslik,
  metin,
  dugmeMetin,
  dugmeYol,
}: {
  ikon?: string;
  baslik: string;
  metin: string;
  dugmeMetin: string;
  dugmeYol: string;
}) {
  return (
    <main className="koyu-alan flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <span className="text-6xl" aria-hidden>{ikon}</span>
      <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">{baslik}</h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">{metin}</p>
      <Link
        href={dugmeYol}
        className="btn-kor parilti mt-8 flex h-14 w-full max-w-sm items-center justify-center rounded-2xl text-lg font-bold"
      >
        {dugmeMetin}
      </Link>
      <Link
        href="/"
        className="mt-4 text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
      >
        ← Ana sayfa
      </Link>
    </main>
  );
}
