"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CodeInput from "@/components/ui/CodeInput";
import EgilenKart from "@/components/EgilenKart";
import { guvenliNext } from "@/lib/guvenliNext";
import { tr } from "@/lib/i18n/tr";

// [OTURUM] iOS'ta ana ekrana eklenen PWA, HttpOnly oturum çerezini her kapanışta
// düşürüyor (WebKit davranışı) — kişi her açılışta kod soruyor sanıyor. Çözüm:
// başarılı girişte 6 haneli kamp kodunu cihazda hatırla (la_giris_kod), açılışta
// oturum yoksa SESSİZCE yeniden giriş yap. Bu kod düşük hassasiyet (zaten kişinin
// WhatsApp'ında, RLS her yerde deny-all, admin erişimi yok). Admin şifresi ASLA
// saklanmaz — bu yalnız katılımcı kamp kodu.
const KOD_ANAHTAR = "la_giris_kod";

export default function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const urlKod = params.get("kod");
  const hedef = guvenliNext(params.get("next")) ?? "/";
  const initialKod =
    urlKod && /^[0-9]{6}$/.test(urlKod) ? urlKod : "";

  const [kod, setKod] = useState(initialKod);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  // Hatırlanan kodla sessiz yeniden giriş denenirken formu gizle ("bağlanıyor").
  const [sessizDeniyor, setSessizDeniyor] = useState(false);
  const autoSubmitted = useRef(false);

  const submit = useCallback(
    async (deger: string, hatirla = true) => {
      if (yukleniyor) return;
      setYukleniyor(true);
      setHata(null);
      try {
        const res = await fetch("/api/giris", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kod: deger }),
        });
        const veri = await res.json().catch(() => null);
        if (!res.ok) {
          setHata(veri?.hata ?? tr.giris.hataSunucu);
          setKod("");
          // Hatırlanan kod artık geçersizse temizle (yoksa açılışta döngüye girer).
          try { localStorage.removeItem(KOD_ANAHTAR); } catch {}
          return;
        }
        // [OTURUM] Kodu cihazda hatırla — sonraki açılışta sessiz giriş için.
        if (hatirla) { try { localStorage.setItem(KOD_ANAHTAR, deger); } catch {} }
        router.replace(hedef);
      } catch {
        setHata(tr.giris.hataSunucu);
      } finally {
        setYukleniyor(false);
      }
    },
    [router, yukleniyor, hedef]
  );

  // QR'dan gelen kod: bir kez otomatik gönder
  const handleComplete = useCallback(
    (deger: string) => {
      if (autoSubmitted.current) return;
      autoSubmitted.current = true;
      void submit(deger);
    },
    [submit]
  );

  // [OTURUM] Açılışta sessiz yeniden giriş: URL'de kod yoksa ama cihazda
  // hatırlanan geçerli bir kod varsa, formu göstermeden otomatik gir.
  useEffect(() => {
    // Çıkış yapıldıysa hatırlanan kodu sil + sessiz girişi atla (yoksa geri girer).
    if (params.get("cikis")) {
      try { localStorage.removeItem(KOD_ANAHTAR); } catch {}
      return;
    }
    if (urlKod || autoSubmitted.current) return;
    let hatirlanan: string | null = null;
    try { hatirlanan = localStorage.getItem(KOD_ANAHTAR); } catch {}
    if (hatirlanan && /^[0-9]{6}$/.test(hatirlanan)) {
      autoSubmitted.current = true;
      setSessizDeniyor(true);
      void submit(hatirlanan).finally(() => setSessizDeniyor(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sessiz giriş sürerken minimal "bağlanıyor" ekranı — kod formu yanıp sönmesin.
  if (sessizDeniyor) {
    return (
      <EgilenKart className="w-full max-w-sm rounded-3xl">
        <div className="kart-cam relative w-full overflow-hidden rounded-3xl p-8 text-center">
          <h1 className="prizma-serif ay-metin text-4xl font-semibold tracking-tight">AYNA</h1>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-gold" aria-hidden />
            Seni hatırlıyorum, bağlanıyorsun…
          </p>
        </div>
      </EgilenKart>
    );
  }

  return (
    <EgilenKart className="w-full max-w-sm rounded-3xl">
    <div className="kart-cam relative w-full overflow-hidden rounded-3xl p-5 sm:p-8">
      <p className="prizma-serif text-center text-xs uppercase tracking-[0.45em] text-slate-400">
        Liderlik
      </p>
      <h1 className="prizma-serif ay-metin mt-1 text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        AYNA
      </h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
        {tr.giris.altBaslik}
      </p>

      <form
        className="mt-5 space-y-4 sm:mt-8 sm:space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (kod.length === 6) void submit(kod);
        }}
      >
        <CodeInput
          value={kod}
          onChange={(v) => {
            autoSubmitted.current = false;
            setKod(v);
            setHata(null);
          }}
          onComplete={handleComplete}
          disabled={yukleniyor}
        />

        {hata && (
          <p role="alert" className="text-center text-sm font-medium text-red-400">
            {hata}
          </p>
        )}

        <button
          type="submit"
          disabled={kod.length !== 6 || yukleniyor}
          className="btn-kor h-12 w-full rounded-xl font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {yukleniyor ? tr.giris.girisYapiliyor : tr.giris.girisYap}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/admin/giris"
          className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          {tr.giris.yoneticiGirisi}
        </Link>
      </p>
    </div>
    </EgilenKart>
  );
}
