// Evergreen posta motoru — ortak modül (rota DEĞİL; _ öneki yönlendirilmez).
// Kural: herkes 1. mailden başlar; kişi ne zaman katıldıysa dizi ONUN
// takviminde akar (biri 5.'yi alırken diğeri 25.'yi alır). Gönderim Resend
// üzerinden; anahtar yoksa motor uykudadır, kayıt yine de birikir.
export interface PostaOrtam {
  BULTEN_KV?: KVNamespace;
  RESEND_API_KEY?: string;
  POSTA_GOREV_ANAHTARI?: string;
  GONDEREN?: string;
}

export type Abone = {
  katilim: string; // ISO — dizinin sıfır noktası
  sira: number; // sıradaki mail indeksi
  durum: "aktif" | "iptal";
  kaynak?: string;
  sonGonderim?: string | null;
};

// Eski kayıt biçimiyle (düz ISO string) geriye uyumlu çözümleme.
export function aboneCoz(ham: string): Abone {
  try {
    const a = JSON.parse(ham) as Abone;
    if (a && typeof a === "object" && a.katilim) {
      return {
        katilim: a.katilim,
        sira: Number(a.sira) || 0,
        durum: a.durum === "iptal" ? "iptal" : "aktif",
        kaynak: a.kaynak,
        sonGonderim: a.sonGonderim ?? null,
      };
    }
  } catch {
    /* düz string — eski biçim */
  }
  return { katilim: ham, sira: 0, durum: "aktif", sonGonderim: null };
}

// İptal bağlantısı imzası: HMAC-SHA256(eposta) ilk 16 hex.
export async function imzala(eposta: string, anahtar: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(anahtar),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const iz = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(eposta.toLowerCase()),
  );
  return [...new Uint8Array(iz)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/* Dizi — kısa, tek fikirli, sahadan notlar. Gün = katılımdan kaç gün sonra.
   İlk hafta sık (0-2-4-7), sonrası haftalık. İçerik Emre'nin gerçek
   öğretilerinden; gelir vaadi ve kariyer basamağı adı YOK. */
export const DIZI: { gun: number; konu: string; govde: string[] }[] = [
  {
    gun: 0,
    konu: "Bu liste ne — ve neden kısa tutacağım",
    govde: [
      "Hoş geldin. Ben Emre. 2013'te bu işe 5 el sıkışmayla başladım; bugün 4 kıtada 200.000'i aşkın kişilik bir ağın kurulmasına vesile oldum. Bunları övünmek için değil, şunu diyebilmek için yazıyorum: buradan okuyacakların teoriden değil, sahadan geliyor.",
      "Bu listeden sana kısa notlar atacağım. Her seferinde tek fikir, iki dakikalık okuma. Satış yok, sihirli formül yok.",
      "Tek derdim var: doğrudan satış, işi yanlış öğretenler yüzünden hak etmediği bir üne mahkûm oldu. Ben bunu değiştirmeye kararlıyım — bu notlar o işin bir parçası.",
      "İlk not iki gün sonra sende. Konusu: motivasyonun raf ömrü.",
    ],
  },
  {
    gun: 2,
    konu: "Motivasyonun raf ömrü: 72 saat",
    govde: [
      "İlk gün heyecan doruktadır. Üçüncü gün söner. Bu senin zayıflığın değil; insanın doğası. Kitabıma 'İlk 72 Saat' adını bu yüzden verdim.",
      "Başarılı olanlarla bırakanlar arasındaki fark motivasyon değil: motivasyon SÖNDÜĞÜNDE ne yapacağını önceden belirlemiş olmak.",
      "Bugünlük tek soru: şu an ertelediğin o iş için, heyecanın bittiği gün devreye girecek kuralın ne? Yoksa, bir cümleyle yaz. Kural, duygudan güçlüdür.",
    ],
  },
  {
    gun: 4,
    konu: "Ekleme değil, katlama",
    govde: [
      "Bu sektörde herkes eklemeyi bir şekilde keşfeder: bir kişi daha, bir satış daha. Katlanacağını ise sadece umar — en büyük oyuncular dahil.",
      "Ekleme senin eforunla sınırlıdır; katlama, öğrettiğin insanın öğretebilmesiyle başlar. Yani soru 'kaç kişi ekledin?' değil: 'eklediğin kişi sensiz ne yapabiliyor?'",
      "Ekibin varsa bugün bir kişine bir işi ÖĞRET, yapma. Yoksa şunu not et: bu iş üye toplamak değil, insan yetiştirmek.",
    ],
  },
  {
    gun: 7,
    konu: "80 / 15 / 5 — yanlış yerde çok çalışıyorsun",
    govde: [
      "Zamanının %80'i görüşmeye, sunuma, takibe gider — sonucun sadece %5'i oradan gelir. Zamanının %5'i toplantıya, kampa gider — sonucun %80'i oradan gelir.",
      "Çoğu insan bunu bilmediği için 'çok çalışıyorum ama olmuyor' der. Doğru: çok çalışıyorsun, ama yanlış yerde.",
      "Bu hafta ajandana bak: sonucun %80'ini getiren türden kaç saat var? Cevap seni rahatsız ediyorsa, not tam yerine ulaşmış demektir.",
    ],
  },
  {
    gun: 14,
    konu: "İlk ay sadece 5 kişiyle el sıkıştım",
    govde: [
      "Şubat 2013. İlk ay 5 kişiyle el sıkıştım. Ay sonunda ağ 19 kişiydi; ikinci ayda 88'e katlandı.",
      "Bunu anlatıyorum çünkü herkes büyük başlamak istiyor ve büyük başlayamadığı için hiç başlamıyor. Hız, doğru sistemin kanıtıdır; büyüklük değil.",
      "Küçük başla. Düzenli devam et. Katlamayı matematiğe bırak.",
    ],
  },
  {
    gun: 21,
    konu: "Kayıt olduğun gün değil",
    govde: [
      "Bir söz: 'Kayıt olduğun gün değil, karar verdiğin gün başlarsın.'",
      "Yıllardır insan izliyorum: kâğıt üstünde başlayıp hiç başlamamış binlerce kişi var. Karar; takvimin, listenin ve ilk davetin varsa verilmiştir. Yoksa niyet aşamasındasın demektir — ve niyet, sonuç üretmez.",
      "Bugün kendine dürüst tek soru: ben karar verdim mi, yoksa hâlâ niyet mi ediyorum?",
    ],
  },
  {
    gun: 28,
    konu: "'Çevrem yok' cümlesi",
    govde: [
      "En sık duyduğum itiraz: 'Çevrem yok.' Benim de yoktu — 5 kişiyle başladım.",
      "Bu bir çevre işi değil. Tanıdığın kişilerle başlar, ONLARIN çevresiyle katlanır. Çevre aranmaz; ilk halkadan üretilir.",
      "Aklına gelen ilk 10 ismi yaz — arayacağın için değil, 'çevrem yok' cümlesinin doğru olup olmadığını görmen için. Genelde değildir.",
    ],
  },
  {
    gun: 35,
    konu: "Üç çeşit lider vardır",
    govde: [
      "Birincisi şans eseri liderleşir: işler ters gidince sektöre küser. İkincisi aşırı çalışkanlıkla liderleşir: farkında olmadan bazı doğruları yapar ama sorun çıkınca suçu firmada, üründe arar; yıllar içinde kendini tüketir.",
      "Üçüncüsü formülü bilir: bir kere yaptığını yüz kere de yapabilir, çünkü NEDEN çalıştığını bilir. Sektörün vadettiği hayatı gerçekten yaşayanlar bunlardır.",
      "Soru basit ama acımasız: sen hangisisin? Ve daha önemlisi: ekibine hangisini üretiyorsun?",
    ],
  },
  {
    gun: 42,
    konu: "Davet, rica değildir",
    govde: [
      "Çoğu davet aslında özür gibidir: 'Müsait olursan, belki, bir bakarsın...' Karşı taraf ilgisizliği değil, senin güvensizliğini reddeder.",
      "Davet net olur: ne için, ne zaman, ne kadar süre. 'Salı 21:00'de 20 dakikanı istiyorum; sana bir şey göstereceğim, kararı sen vereceksin.'",
      "İhtiyacın olan şey onay değil, netlik. Netlik saygı üretir; rica acıma üretir.",
    ],
  },
  {
    gun: 49,
    konu: "Karizma sistem değildir",
    govde: [
      "Sektörde çok karizmatik ama ekibi katlanamayan lider gördüm. Sebep hep aynı: yaptığı şey kopyalanamıyor.",
      "Neyin işe yaradığı değil, neyin KOPYALANABİLDİĞİ önemlidir. Karizman, yeteneğin işe yarayabilir — ama ekibine öğretemiyorsan, sen ne kadar parlarsan ekip o kadar gölgede kalır.",
      "Bu hafta yaptığın en etkili şeyi düşün: onu en yeni üyen de aynen yapabilir mi? Hayırsa, elinde sistem değil, gösteri var.",
    ],
  },
  {
    gun: 56,
    konu: "İnsanlar sözlerini değil, seni takip eder",
    govde: [
      "Ekibine ne söylediğin değil, onlar bakmıyorken ne yaptığın belirleyicidir. Toplantıya geç kalan liderin ekibi dakik olmaz. Takip etmeyen liderin ekibi takip etmez.",
      "Liderlik anlatılmaz; sızar.",
      "Bugün tek kontrol: ekibinden (ya da gelecekteki ekibinden) beklediğin üç davranışı yaz. Üçünü de bu hafta kendin yaptın mı?",
    ],
  },
  {
    gun: 63,
    konu: "72 Saat Kulübü — kapı önce buradan açılır",
    govde: [
      "Baştan beri okuduğun bu notların bir de canlı hâli var: 72 Saat Kulübü. Tüm doğrudan satış dünyasına açık, ücretsiz, üç gecelik canlı bir okul — firma fark etmez, ekip fark etmez.",
      "Amacı bu listeyle aynı: işi doğru öğretmek ve sektörü, hak etmediği ünden kurtarmak. Kimseyi ekibimden koparmam; kural bu.",
      "Dönem tarihleri kamuya açıklanmadan önce bu listeye yazılır. Yani doğru yerdesin — kapı açıldığında ilk duyan sen olacaksın.",
    ],
  },
];

const VARSAYILAN_GONDEREN = "Emre Topçu <notlar@emretopcu.ai>";

function htmlKacir(m: string): string {
  return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sablon(konu: string, govde: string[], iptalUrl: string): string {
  const paragraflar = govde
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#2a2a2e;">${htmlKacir(p)}</p>`,
    )
    .join("");
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:0;background:#f1efe9;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:Georgia,'Times New Roman',serif;">
  <p style="margin:0 0 24px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#9a7a2c;">Emre Topçu — Sahadan Notlar</p>
  <div style="background:#ffffff;border:1px solid rgba(154,122,44,0.25);border-radius:14px;padding:28px 26px;">
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#1a1a1d;">${htmlKacir(konu)}</h1>
    ${paragraflar}
    <p style="margin:22px 0 0;font-size:16px;color:#1a1a1d;">— Emre</p>
  </div>
  <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8a877f;">
    Bu notu, emretopcu.ai üzerinden listeye kaydolduğun için alıyorsun.
    İstediğin an <a href="${iptalUrl}" style="color:#9a7a2c;">tek dokunuşla ayrılabilirsin</a> — kırılmam, veri de silinir.
  </p>
</div>
</body></html>`;
}

/* Dizideki `indeks`. maili gönderir. Başarı=true; anahtar yoksa veya
   Resend reddederse false — çağıran sira'yı İLERLETMEZ, yarın yine dener. */
export async function postaGonder(
  env: PostaOrtam,
  eposta: string,
  indeks: number,
): Promise<boolean> {
  const mail = DIZI[indeks];
  if (!mail || !env.RESEND_API_KEY || !env.POSTA_GOREV_ANAHTARI) return false;
  const t = await imzala(eposta, env.POSTA_GOREV_ANAHTARI);
  const iptalUrl = `https://emretopcu.ai/api/abonelik-iptal?e=${encodeURIComponent(eposta)}&t=${t}`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.GONDEREN || VARSAYILAN_GONDEREN,
        to: eposta,
        subject: mail.konu,
        html: sablon(mail.konu, mail.govde, iptalUrl),
        headers: { "List-Unsubscribe": `<${iptalUrl}>` },
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
