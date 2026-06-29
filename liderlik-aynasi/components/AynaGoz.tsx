"use client";

// AYNA'NIN YAŞAYAN GÖZÜ — /ekran'ın merkezinde, düşük opaklıkta nefes alan bir
// iris/gözbebeği. Salon "AYNA'nın gözünün içinde" yaşar: bir bilinç burayı
// izliyor. Enerjiyle hızlanır/parlar (= salonun nabzı), fiero'da ışıldar.
// Saf görsel — hiçbir veri değişmez. content'in ARKASINDA durur (z-0).
export default function AynaGoz({
  enerji = 0,
  fiero = false,
}: {
  enerji?: number;
  fiero?: boolean;
}) {
  const e = Math.max(0, Math.min(1, enerji));
  // Nabız: sakinken 6s, yüksek enerjide ~3s. Parlaklık enerji + fiero ile artar.
  const sure = 6 - e * 3;
  const parlak = 0.12 + e * 0.16 + (fiero ? 0.28 : 0);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <div
        className="ayna-goz relative rounded-full"
        style={{
          width: "min(72vh, 64vw)",
          height: "min(72vh, 64vw)",
          opacity: parlak,
          animationDuration: `${sure}s`,
        }}
      >
        {/* dış hâle */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, transparent 30%, rgba(212,175,55,0.55) 45%, rgba(78,124,166,0.45) 60%, transparent 73%)",
          }}
        />
        {/* iris dokusu — çok yavaş döner */}
        <div
          className="ayna-goz-iris absolute inset-[16%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(212,175,55,0.22), transparent 7%, rgba(78,124,166,0.22) 14%, transparent 21%, rgba(212,175,55,0.22) 28%, transparent 35%, rgba(78,124,166,0.22) 42%, transparent 49%, rgba(212,175,55,0.22) 56%, transparent 63%, rgba(78,124,166,0.22) 70%, transparent 77%, rgba(212,175,55,0.22) 84%, transparent 91%, rgba(78,124,166,0.22) 98%, transparent)",
          }}
        />
        {/* gözbebeği */}
        <div className="absolute inset-[36%] rounded-full bg-[#01060c] shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]" />
        {/* ışık yansıması */}
        <div className="absolute left-[41%] top-[39%] h-[5%] w-[5%] rounded-full bg-white/60 blur-[2px]" />
      </div>
    </div>
  );
}
