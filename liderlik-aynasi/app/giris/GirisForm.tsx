"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CodeInput from "@/components/ui/CodeInput";
import EgilenKart from "@/components/EgilenKart";
import { tr } from "@/lib/i18n/tr";

export default function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const urlKod = params.get("kod");
  const initialKod =
    urlKod && /^[0-9]{6}$/.test(urlKod) ? urlKod : "";

  const [kod, setKod] = useState(initialKod);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const autoSubmitted = useRef(false);

  const submit = useCallback(
    async (deger: string) => {
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
          return;
        }
        router.replace("/");
      } catch {
        setHata(tr.giris.hataSunucu);
      } finally {
        setYukleniyor(false);
      }
    },
    [router, yukleniyor]
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

  return (
    <EgilenKart className="w-full max-w-sm rounded-3xl">
    <div className="kart-cam relative w-full overflow-hidden rounded-3xl p-8">
      <p className="prizma-serif text-center text-xs uppercase tracking-[0.45em] text-slate-400">
        Liderlik
      </p>
      <h1 className="prizma-serif ay-metin mt-1 text-center text-5xl font-semibold tracking-tight">
        AYNA
      </h1>
      <p className="mt-4 text-center text-sm leading-relaxed text-slate-300">
        {tr.giris.altBaslik}
      </p>

      <form
        className="mt-8 space-y-6"
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
