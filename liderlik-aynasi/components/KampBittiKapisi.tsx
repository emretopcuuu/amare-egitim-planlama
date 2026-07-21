import Link from "next/link";

// [YOLCULUK #14] Kamp bitince (mod=yolculuk) saf kamp rotalarına (/program,
// /oyun-secimi, dalga kapalı /degerlendir) eski bir push/yer imiyle girilirse
// boş/kafa karıştırıcı ekran yerine nazik bir kapı: "kamp tamamlandı" + 90-gün
// yoluna köprü. AltNav zaten bu sekmeleri değiştiriyor; bu, doğrudan URL kaçağını
// da yakalar. Rotalar/sayfalar SİLİNMEZ — kamp modunda aynen çalışır.
export default function KampBittiKapisi({ baslik }: { baslik?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl" aria-hidden>🏕</p>
      <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
        {baslik ?? "Kamp tamamlandı"}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
        Bu bölüm kampa özeldi. Sen artık 90 günlük yolundasın — asıl iş şimdi sahada.
      </p>
      <Link
        href="/takip"
        className="btn-kor mt-6 flex h-12 w-full max-w-xs items-center justify-center rounded-xl text-base font-bold"
      >
        🧭 Yoluma Devam Et
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
