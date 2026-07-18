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
