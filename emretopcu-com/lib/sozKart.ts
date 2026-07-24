"use client";

// Söz kartı üretici: bir sözü paylaşılabilir bir PNG karta (1080×1080) çizer.
// Marka tutarlılığı için kart her zaman porselen + altın (site teması ne olursa
// olsun). Canvas'ta güvenli, her yerde yüklü sistem serifi (Georgia) kullanılır.

function satirlaraBol(
  x: CanvasRenderingContext2D,
  metin: string,
  maxGenislik: number,
): string[] {
  const kelimeler = metin.split(" ");
  const satirlar: string[] = [];
  let satir = "";
  for (const k of kelimeler) {
    const deneme = satir ? `${satir} ${k}` : k;
    if (x.measureText(deneme).width > maxGenislik && satir) {
      satirlar.push(satir);
      satir = k;
    } else {
      satir = deneme;
    }
  }
  if (satir) satirlar.push(satir);
  return satirlar;
}

export async function sozKartiUret(soz: string): Promise<Blob | null> {
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const x = cv.getContext("2d");
  if (!x) return null;

  try {
    await document.fonts.ready;
  } catch {
    /* yoksay */
  }

  // Zemin
  x.fillStyle = "#f1efe9";
  x.fillRect(0, 0, S, S);

  // İnce altın çerçeve
  x.strokeStyle = "rgba(154,122,44,0.45)";
  x.lineWidth = 3;
  x.strokeRect(48, 48, S - 96, S - 96);

  x.textAlign = "center";

  // Üst marka etiketi
  x.fillStyle = "#9a7a2c";
  x.font = "600 26px Georgia, 'Times New Roman', serif";
  x.letterSpacing = "8px";
  x.fillText("EMRE TOPÇU", S / 2 + 4, 158);
  x.letterSpacing = "0px";

  // Filigran tırnak
  x.fillStyle = "rgba(154,122,44,0.13)";
  x.font = "700 240px Georgia, serif";
  x.fillText("“", S / 2, 330);

  // Söz — ortalanmış, sarılan büyük serif
  x.fillStyle = "#1a1a1d";
  const boy = soz.length > 90 ? 52 : soz.length > 60 ? 60 : 68;
  x.font = `600 ${boy}px Georgia, 'Times New Roman', serif`;
  const satirlar = satirlaraBol(x, soz, S - 220);
  const satirYuk = boy * 1.32;
  const basY = S / 2 - ((satirlar.length - 1) * satirYuk) / 2 + 20;
  satirlar.forEach((s, i) => x.fillText(s, S / 2, basY + i * satirYuk));

  // Alt: altın çizgi + site + isim
  x.strokeStyle = "rgba(154,122,44,0.5)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(S / 2 - 40, S - 210);
  x.lineTo(S / 2 + 40, S - 210);
  x.stroke();

  x.fillStyle = "#6f6c66";
  x.font = "italic 34px Georgia, serif";
  x.fillText("— Emre Topçu", S / 2, S - 150);

  x.fillStyle = "#9a7a2c";
  x.font = "600 30px Georgia, serif";
  x.letterSpacing = "2px";
  x.fillText("emretopcu.ai", S / 2, S - 100);
  x.letterSpacing = "0px";

  return await new Promise((cozumle) =>
    cv.toBlob((b) => cozumle(b), "image/png", 0.95),
  );
}

// Story formatı (1080×1920) — Instagram/WhatsApp durumu için dikey kart.
export async function sozStoryUret(soz: string): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  if (!x) return null;
  try {
    await document.fonts.ready;
  } catch {
    /* yoksay */
  }
  x.fillStyle = "#f1efe9";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(154,122,44,0.45)";
  x.lineWidth = 3;
  x.strokeRect(56, 56, W - 112, H - 112);
  x.textAlign = "center";
  x.fillStyle = "#9a7a2c";
  x.font = "600 30px Georgia, serif";
  x.letterSpacing = "10px";
  x.fillText("EMRE TOPÇU", W / 2 + 5, 300);
  x.letterSpacing = "0px";
  x.fillStyle = "rgba(154,122,44,0.13)";
  x.font = "700 320px Georgia, serif";
  x.fillText("“", W / 2, 560);
  x.fillStyle = "#1a1a1d";
  const boy = soz.length > 90 ? 66 : soz.length > 60 ? 74 : 84;
  x.font = `600 ${boy}px Georgia, serif`;
  const satirlar = satirlaraBol(x, soz, W - 240);
  const satirYuk = boy * 1.34;
  const basY = H / 2 - ((satirlar.length - 1) * satirYuk) / 2;
  satirlar.forEach((s, i) => x.fillText(s, W / 2, basY + i * satirYuk));
  x.strokeStyle = "rgba(154,122,44,0.5)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W / 2 - 44, H - 360);
  x.lineTo(W / 2 + 44, H - 360);
  x.stroke();
  x.fillStyle = "#6f6c66";
  x.font = "italic 40px Georgia, serif";
  x.fillText("— Emre Topçu", W / 2, H - 290);
  x.fillStyle = "#9a7a2c";
  x.font = "600 36px Georgia, serif";
  x.letterSpacing = "3px";
  x.fillText("emretopcu.ai", W / 2, H - 220);
  x.letterSpacing = "0px";
  return await new Promise((r) => cv.toBlob((b) => r(b), "image/png", 0.95));
}

export async function sozStoryPaylas(soz: string): Promise<void> {
  const blob = await sozStoryUret(soz);
  await blobPaylas(
    blob,
    "emre-topcu-soz-story.png",
    `"${soz}" — Emre Topçu · emretopcu.ai`,
  );
}

// Ortak: bir blob'u paylaş (Web Share) veya indir.
async function blobPaylas(blob: Blob | null, ad: string, metin: string) {
  if (!blob) return;
  const dosya = new File([blob], ad, { type: "image/png" });
  const veri = { files: [dosya], text: metin };
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare(veri)
  ) {
    try {
      await navigator.share(veri);
      return;
    } catch {
      /* iptal → indir */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Katlama projeksiyonu kartı — kişinin kendi rakamıyla ekleme/katlama farkı.
export async function projKartiPaylas(
  aylikKisi: number,
  ay6: number,
  ay12: number,
  dilKodu: "tr" | "en" | "de" | "es" | "ru" | "az" = "tr",
): Promise<void> {
  // Kart metni yalnız TR/EN; diğer diller İngilizceye düşer. Yerel biçim korunur.
  const dil: "tr" | "en" = dilKodu === "tr" ? "tr" : "en";
  const YERELLER: Record<string, string> = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    az: "az-Latn-AZ",
  };
  const yerel = YERELLER[dilKodu] ?? "tr-TR";
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const x = cv.getContext("2d");
  if (!x) return;
  x.fillStyle = "#f1efe9";
  x.fillRect(0, 0, S, S);
  x.strokeStyle = "rgba(154,122,44,0.45)";
  x.lineWidth = 3;
  x.strokeRect(48, 48, S - 96, S - 96);
  x.textAlign = "center";
  x.fillStyle = "#9a7a2c";
  x.font = "600 26px Georgia, serif";
  x.letterSpacing = "8px";
  x.fillText("EMRE TOPÇU", S / 2 + 4, 150);
  x.letterSpacing = "0px";
  x.fillStyle = "#1a1a1d";
  x.font = "600 60px Georgia, serif";
  x.fillText(
    dil === "en" ? "My multiplication" : "Benim katlamam",
    S / 2,
    280,
  );
  x.fillStyle = "#6f6c66";
  x.font = "34px Georgia, serif";
  x.fillText(
    dil === "en"
      ? `Starting from ${aylikKisi} handshakes / month`
      : `Ayda ${aylikKisi} el sıkışmayla`,
    S / 2,
    345,
  );
  // İki büyük rakam
  const yaz = (etiket: string, deger: number, cx: number) => {
    x.fillStyle = "#9a7a2c";
    x.font = "700 92px Georgia, serif";
    x.fillText(deger.toLocaleString(yerel), cx, 560);
    x.fillStyle = "#6f6c66";
    x.font = "30px Georgia, serif";
    x.fillText(etiket, cx, 615);
  };
  yaz(dil === "en" ? "month 6" : "6. ay", ay6, S * 0.33);
  yaz(dil === "en" ? "month 12" : "12. ay", ay12, S * 0.67);
  x.strokeStyle = "rgba(154,122,44,0.5)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(S / 2 - 40, 700);
  x.lineTo(S / 2 + 40, 700);
  x.stroke();
  x.fillStyle = "#6f6c66";
  x.font = "italic 28px Georgia, serif";
  x.fillText(
    dil === "en"
      ? "A math projection, not an income promise."
      : "Bir matematik projeksiyonu; kazanç vaadi değil.",
    S / 2,
    770,
  );
  x.fillStyle = "#9a7a2c";
  x.font = "600 30px Georgia, serif";
  x.letterSpacing = "2px";
  x.fillText("emretopcu.ai", S / 2, S - 100);
  x.letterSpacing = "0px";
  const blob = await new Promise<Blob | null>((r) =>
    cv.toBlob((b) => r(b), "image/png", 0.95),
  );
  await blobPaylas(
    blob,
    "emre-topcu-katlama.png",
    dil === "en"
      ? `My multiplication: ${ay12} in 12 months · emretopcu.ai`
      : `Benim katlamam: 12 ayda ${ay12} · emretopcu.ai`,
  );
}

// Kartı paylaş (mobil: Web Share) veya indir (masaüstü).
export async function sozKartiPaylas(soz: string): Promise<void> {
  const blob = await sozKartiUret(soz);
  if (!blob) return;
  const dosya = new File([blob], "emre-topcu-soz.png", { type: "image/png" });
  const paylasVerisi = {
    files: [dosya],
    text: `"${soz}" — Emre Topçu · emretopcu.ai`,
  };
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare(paylasVerisi)
  ) {
    try {
      await navigator.share(paylasVerisi);
      return;
    } catch {
      /* kullanıcı iptal etti ya da desteklenmiyor → indirmeye düş */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "emre-topcu-soz.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
