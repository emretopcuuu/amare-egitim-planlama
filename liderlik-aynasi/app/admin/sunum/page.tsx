import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import SunumOynatici from "./SunumOynatici";

export const metadata = { title: "Yönetim Sunumu — Liderlik Aynası" };

// Sadece admin: bir adayın 6 aylık yolculuğunu sahnede gösteren demo.
// Tohum sunucuda üretilir (her açılışta farklı aday/varyasyon), istemciye geçer.
export default async function SunumPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");
  // Sabit başlangıç tohumu (SSR saf kalsın); varyasyon istemcide mount'ta üretilir.
  return <SunumOynatici tohum={1} />;
}
