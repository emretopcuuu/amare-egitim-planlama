import "server-only";

// Supabase/PostgREST tek istekte en çok ~1000 satır döndürür. Büyük tabloları
// (atamalar, puanlar, görevler) eksiksiz okumak için sorguyu sayfa sayfa çeker
// ve tamamını birleştirir. Çağıran, her sayfa için range(bas, son) uygular.
//
// Kullanım:
//   const hepsi = await tumKayitlar<Satir>((bas, son) =>
//     db.from("assignments").select("...").order("id").range(bas, son)
//   );
export async function tumKayitlar<T>(
  getirSayfa: (bas: number, son: number) => PromiseLike<{ data: unknown; error: unknown }>,
  boyut = 1000
): Promise<T[]> {
  const hepsi: T[] = [];
  for (let bas = 0; ; bas += boyut) {
    const { data, error } = await getirSayfa(bas, bas + boyut - 1);
    if (error) throw error;
    const parca = (data ?? []) as T[];
    hepsi.push(...parca);
    if (parca.length < boyut) break;
  }
  return hepsi;
}
