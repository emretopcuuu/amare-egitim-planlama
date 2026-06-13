import Link from "next/link";

// Çıkmaz yok: "yapacak bir şey yok" ya da "henüz boş" durumlarda bile büyük,
// net, sıcak bir sonraki adım sun. İkincil (kenarlı) buton — köz birincil
// butonuyla yarışmadan yine de kolay dokunulur. Yaşlı kullanıcı için min 56px.
export default function SicakAdim({
  href,
  etiket,
  vurgu = false,
}: {
  href: string;
  etiket: string;
  vurgu?: boolean;
}) {
  if (vurgu) {
    return (
      <Link
        href={href}
        className="parilti btn-kor flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold transition-transform hover:scale-[1.01]"
      >
        {etiket}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-5 text-base font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
    >
      {etiket}
    </Link>
  );
}
