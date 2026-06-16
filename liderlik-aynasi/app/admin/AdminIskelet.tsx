// #9 Admin iskelet: alt sayfalar sunucudan gelene dek tutarlı yükleme kabuğu.
// Katılımcı tarafındaki IskeletSayfa'nın admin (max-w-4xl) karşılığı.
export default function AdminIskelet({ kart = 3 }: { kart?: number }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="iskelet h-8 w-52 rounded-xl" />
      {Array.from({ length: kart }, (_, i) => (
        <div
          key={i}
          className="kart-3d rounded-2xl bg-midnight-card/60 p-6 ring-1 ring-royal/30"
        >
          <div className="iskelet h-5 w-40 rounded-lg" />
          <div className="iskelet mt-3 h-4 w-full rounded-lg" />
          <div className="iskelet mt-2 h-4 w-2/3 rounded-lg" />
        </div>
      ))}
    </main>
  );
}
