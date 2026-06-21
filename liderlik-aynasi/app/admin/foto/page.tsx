import { redirect } from "next/navigation";

// Fotoğraf moderasyonu artık birleşik Moderasyon sayfasının "Fotoğraflar"
// sekmesi (öneri #6). Eski bağlantılar/yer imleri için buradan yönlendirilir.
export default function FotoModerasyonPage() {
  redirect("/admin/moderasyon?sekme=foto");
}
