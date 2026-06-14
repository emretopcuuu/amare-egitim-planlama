// PROVA MODU bayrağı: tüm sayfalarda sabit kırmızı şerit.
// Admin "prova_modu" ayarını açtığında hem yönetici hem katılımcılar görür;
// gerçek kampla test ortamını karıştırmak imkânsız hale gelir.
export default function ProvaModuBayragi() {
  return (
    <div
      className="sticky top-0 z-[90] flex items-center justify-center gap-2 bg-red-600 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white select-none"
      aria-label="Prova modu aktif — test ortamı"
    >
      <span aria-hidden>⚠️</span>
      <span>PROVA MODU — Bu bir test ortamıdır</span>
    </div>
  );
}
