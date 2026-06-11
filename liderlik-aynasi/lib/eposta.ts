import "server-only";
import { tr } from "@/lib/i18n/tr";

// Davet e-postaları Postmark ile gönderilir (ana uygulamanın da kullandığı
// sağlayıcı). Tek dokunuş noktası burası — sağlayıcı değişirse yalnızca bu
// modül güncellenir.

export function epostaYapilandirildiMi(): boolean {
  return !!process.env.POSTMARK_SERVER_TOKEN && !!process.env.EMAIL_FROM;
}

export async function davetGonder(
  alici: string,
  ad: string,
  kod: string,
  origin: string
): Promise<boolean> {
  const link = `${origin}/giris?kod=${kod}`;
  const t = tr.eposta;

  const govde = {
    From: process.env.EMAIL_FROM!,
    To: alici,
    Subject: t.davetKonu,
    TextBody: t.davetMetin(ad, link, kod),
    HtmlBody: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#1e1233;color:#f1f5f9;border-radius:16px">
        <p style="color:#a78bfa;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0">Liderlik Aynası</p>
        <h1 style="color:#d4af37;font-size:26px;margin:12px 0 0">${t.davetBaslik}</h1>
        <p style="line-height:1.6;margin-top:16px">${t.davetParagraf(ad)}</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#d4af37;color:#1e1233;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">${t.davetButon}</a>
        </p>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6">${t.davetKodNotu(kod)}</p>
      </div>`,
    MessageStream: "outbound",
  };

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN!,
      },
      body: JSON.stringify(govde),
    });
    return res.ok;
  } catch {
    return false;
  }
}
