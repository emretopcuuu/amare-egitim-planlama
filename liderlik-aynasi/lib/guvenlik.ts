import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { uyariEpostasiGonder } from "@/lib/eposta";

// GÜVENLİK SINIRI — AYNA bir koçtur, terapist değil (Üç Kariyer Hâli belgesi 3.6).
// Katılımcının serbest metninde GERÇEK bir kriz/umutsuzluk sinyali görülürse:
// (1) kişiye şefkatli bir insan-mentora yönlendirme mesajı gösterilir,
// (2) admin'e sessiz bir bayrak (audit_log) + e-posta uyarısı gider.
//
// ÖNEMLİ KALİBRASYON: "değersizim", "yetersizim", "tıkandım" gibi LİDERLİK
// öz-şüphesi bu kampın NORMAL çalışma malzemesidir (C personasının iç engeli) —
// bunlar kriz DEĞİLDİR ve işaretlenMEZ. Yalnız bariz sıkıntı/zarar/umutsuzluk
// registeri yakalanır. Az ama doğru: alarm yorgunluğu da bir güvenlik riskidir.

// Türkçe küçük harfe indir (I/İ duyarlı) — eşleşme normalizasyonu.
function kucult(s: string): string {
  return s
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Gerçek kriz/zarar registeri — çok kelimeli, sıkıntıya özgü ifadeler.
// (Tek başına "değersizim" gibi liderlik öz-şüphesi BİLİNÇLİ olarak yok.)
const KRIZ_KALIPLARI: string[] = [
  // kendine zarar / yaşamı sonlandırma
  "intihar",
  "canıma kıy",
  "yaşamak istemiyorum",
  "ölmek istiyorum",
  "yok olmak istiyorum",
  "kendime zarar",
  "kendime kıy",
  "yaşamın bir anlamı yok",
  "hayatın bir anlamı yok",
  "bitse de kurtulsam",
  "kaybolup gitmek istiyorum",
  "buralarda olmasam",
  "ortadan kaybolmak istiyorum",
  // derin umutsuzluk / çöküş
  "hiçbir umudum yok",
  "hiç umudum kalmadı",
  "artık dayanamıyorum",
  "dayanacak gücüm kalmadı",
  "tamamen tükendim",
  "her şey anlamsız",
  "hiçbir çıkış yok",
  "çıkış yolu göremiyorum",
  "kimseye faydam yok",
  "yük oluyorum",
  "pes ediyorum artık",
  "her şeyi bırakmak istiyorum",
];

/** Serbest metinde gerçek bir kriz/umutsuzluk sinyali var mı (deterministik). */
export function krizDiliVarMi(metin: string | null | undefined): boolean {
  if (!metin) return false;
  const m = kucult(metin);
  return KRIZ_KALIPLARI.some((k) => m.includes(kucult(k)));
}

// Kişiye gösterilecek şefkatli yönlendirme — AYNA koç sınırında kalır.
export const KRIZ_YONLENDIRME =
  "Yazdıkların bana dokundu ve seni ciddiye alıyorum. Ben bir yol arkadaşıyım ama bazı yükler bir insanın yanında, yüz yüze paylaşılmayı hak eder. Bugün güvendiğin bir liderinle, mentorunla ya da sevdiğin biriyle bunu konuşmanı çok isterim. Yalnız değilsin. Acil bir durumda 112'yi arayabilir ya da 182 (Sağlık Bakanlığı) hattına ulaşabilirsin.";

// Aynı kişi için günde tek uyarı (spam değil, ama her kişi ayrı yakalanır).
export async function krizUyarisiGonder(
  db: Db,
  pid: string,
  kisiAdi: string,
  kaynak: string,
  alinti: string
): Promise<void> {
  try {
    const gun = new Date().toISOString().slice(0, 10);
    const anahtar = `kriz_uyari_${pid}_${gun}`;
    const { data } = await db
      .from("settings")
      .select("key")
      .eq("key", anahtar)
      .maybeSingle();

    // audit_log'a HER tespit yazılır (admin geçmişi görsün); e-posta günde bir.
    await db.from("audit_log").insert({
      eylem: "kriz_dili_tespit",
      detay: { participant_id: pid, kaynak, alinti: alinti.slice(0, 300) },
    });

    if (data) return; // bugün bu kişi için e-posta zaten gitti

    const konu = `🟠 AYNA güvenlik bayrağı: ${kisiAdi}`;
    const metin =
      `Bir katılımcının yazısında olası bir kriz/umutsuzluk sinyali yakalandı. ` +
      `AYNA kişiyi bir insan mentora yönlendirdi; lütfen siz de nazikçe ulaşın.\n\n` +
      `Kişi: ${kisiAdi}\nKaynak: ${kaynak}\nAlıntı: "${alinti.slice(0, 300)}"`;
    const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#ea580c;margin:0 0 12px">${konu}</h2>
        <p style="line-height:1.6;color:#1e293b">Bir katılımcının yazısında olası bir kriz/umutsuzluk sinyali yakalandı. AYNA kişiyi bir insan mentora yönlendirdi; lütfen siz de nazikçe ulaşın.</p>
        <p style="font-size:13px;color:#64748b;margin:16px 0 4px">Kişi: <b>${kisiAdi}</b> · Kaynak: <b>${kaynak}</b></p>
        <pre style="font-size:12px;background:#fff7ed;padding:10px;border-radius:8px;white-space:pre-wrap;color:#9a3412;margin:0">${alinti.slice(0, 300)}</pre>
      </div>`;

    const ok = await uyariEpostasiGonder(konu, metin, html);
    if (ok) {
      await db.from("settings").upsert({
        key: anahtar,
        value: "1",
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    // güvenlik bayrağı yolu ana akışı asla bozmaz
  }
}
