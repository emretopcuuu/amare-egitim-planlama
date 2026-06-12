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
  origin: string,
  soz?: string | null
): Promise<boolean> {
  const link = `${origin}/giris?kod=${kod}`;
  const t = tr.eposta;

  // Kampın son gecesi AYNA'ya yazılan SÖZ, 90 gün sonra sahibine geri döner.
  const sozHtml = soz
    ? `<div style="margin:24px 0;padding:18px;border-left:3px solid #f59e0b;background:#0a1c2e;border-radius:0 12px 12px 0">
        <p style="color:#fbbf24;font-weight:bold;margin:0">${t.davetSozBaslik}</p>
        <p style="color:#cbd5e1;font-style:italic;line-height:1.6;margin:10px 0 0;white-space:pre-wrap">${t.davetSozMetin(soz)}</p>
      </div>`
    : "";
  const sozMetin = soz ? `\n\n${t.davetSozBaslik}\n${t.davetSozMetin(soz)}` : "";

  const govde = {
    From: process.env.EMAIL_FROM!,
    To: alici,
    Subject: t.davetKonu,
    TextBody: t.davetMetin(ad, link, kod) + sozMetin,
    HtmlBody: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#06121e;color:#f1f5f9;border-radius:16px;overflow:hidden">
        <img src="${origin}/og.jpg" alt="Gece Gölü" width="520" style="display:block;width:100%;height:auto" />
        <div style="padding:32px">
        <p style="color:#9cc3e0;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0">Liderlik Aynası</p>
        <h1 style="color:#f59e0b;font-size:26px;margin:12px 0 0">${t.davetBaslik}</h1>
        <p style="line-height:1.6;margin-top:16px">${t.davetParagraf(ad)}</p>
        ${sozHtml}
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#f59e0b;color:#06121e;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">${t.davetButon}</a>
        </p>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6">${t.davetKodNotu(kod)}</p>
        </div>
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
