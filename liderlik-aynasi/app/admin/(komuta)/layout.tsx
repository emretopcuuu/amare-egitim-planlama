import KomutaSekme from "../KomutaSekme";

export default function KomutaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-6 pt-6">
        <KomutaSekme />
      </div>
      {children}
    </>
  );
}
