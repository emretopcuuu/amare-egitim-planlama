import { getSession } from "@/lib/auth/session";
import AdminNav from "./AdminNav";

// /admin/giris da bu layout'tan geçer: nav yalnızca admin oturumunda görünür.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <AdminNav ad={session.ad} />
      {children}
    </div>
  );
}
