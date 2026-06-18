import AdminIskelet from "./AdminIskelet";

// Admin paneli sunucudan gelene dek tutarlı yükleme kabuğu — boş/donuk ekran
// yerine iskelet. Alt sayfalarda zaten var; ana panelde de eksikti.
export default function AdminYukleniyor() {
  return <AdminIskelet kart={4} />;
}
