// Sinematik sayfa geçişi: template.tsx her gezinmede yeniden mount olur, böylece
// her sayfa yumuşakça belirir (fade + minik ölçek). prefers-reduced-motion
// global kuralı bu animasyonu otomatik susturur.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="sayfa-gecis">{children}</div>;
}
