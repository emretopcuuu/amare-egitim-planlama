// İskelet yükleme yer tutucusu — sayfa sunucudan gelene dek gösterilir.
// loading.tsx dosyalarında kullanılır; merkezi düzenle birebir aynı kabuğu çizer.
export function IskeletSayfa({ kart = 3 }: { kart?: number }) {
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
        {/* Başlık yer tutucu */}
        <div className="space-y-2 text-center">
          <div className="iskelet mx-auto h-8 w-48 rounded-xl" />
          <div className="iskelet mx-auto h-4 w-64 rounded-lg" />
        </div>
        {/* Kart yer tutucuları */}
        {Array.from({ length: kart }, (_, i) => (
          <div key={i} className="kart-cam rounded-3xl p-5">
            <div className="iskelet h-5 w-32 rounded-lg" />
            <div className="iskelet mt-3 h-4 w-full rounded-lg" />
            <div className="iskelet mt-2 h-4 w-3/4 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
