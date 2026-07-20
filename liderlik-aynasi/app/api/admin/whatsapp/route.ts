import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sablonBul, degiskenleriUret } from "@/lib/whatsappSablonlari";
import {
  whatsAppYapilandirildiMi,
  whatsAppGonder,
  whatsAppGonderDetayli,
  sablonSidGetir,
  whatsAppAdresi,
} from "@/lib/whatsapp";
import { yazAuditLog } from "@/lib/auditLog";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

type Kisi = { id: string; full_name: string; phone: string | null; login_code: string; team: string | null };

const t = tr.admin.whatsapp;

// PD101 WhatsApp gönderimi. Yüksek etkili (dış kanal, ücretli) → tam yetkili admin.
// Beden: { sablon, hedefTipi, takim?, kisiIds?, mesaj? }
//  hedefTipi: "genel" | "takim" | "kisiler" | "odevYapmayan"
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  if (!whatsAppYapilandirildiMi()) {
    return Response.json({ hata: t.api.yapilandirilmadi }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const sablon = sablonBul(body?.sablon);
  if (!sablon) return Response.json({ hata: t.api.sablonYok }, { status: 400 });

  const db = supabaseAdmin();

  // "giris" tek-mesaj kod modunda davet şablonu kullanılmaz — contentSid şartı
  // yalnız diğer şablonlar için (kod şablonu sid'i aşağıda ayrıca çözülür).
  const contentSid = await sablonSidGetir(db, sablon);
  if (!contentSid && sablon.anahtar !== "giris") {
    return Response.json({ hata: t.api.sablonKayitsiz(sablon.etiket) }, { status: 400 });
  }

  // GRUPLARA ÖZEL LİNK: her takıma KENDİ serbest metniyle ayrı bir gönderim —
  // tek bir "mesaj" yerine {takim, mesaj} listesi. Yalnız serbest (duyuru)
  // şablonla çalışır; her grup yalnızca kendi takımındaki kişilere gider.
  if (body?.hedefTipi === "gruplar") {
    if (!sablon.serbestMi) return Response.json({ hata: t.api.mesajBos }, { status: 400 });
    const gruplarHam = Array.isArray(body?.gruplar) ? body.gruplar : [];
    const gruplar = gruplarHam
      .map((g: unknown) => {
        const rec = g as { takim?: unknown; mesaj?: unknown };
        const takim = typeof rec?.takim === "string" ? rec.takim.trim() : "";
        const mesaj = typeof rec?.mesaj === "string" ? rec.mesaj.trim().slice(0, 600) : "";
        return { takim, mesaj };
      })
      .filter((g: { takim: string; mesaj: string }) => g.takim && g.mesaj);
    if (gruplar.length === 0) {
      return Response.json({ hata: t.api.hedefYok }, { status: 400 });
    }

    const detay: {
      takim: string;
      basarili: number;
      basarisiz: number;
      telefonsuz: number;
      hataOrnegi?: string;
    }[] = [];
    let basariliToplam = 0;
    let basarisizToplam = 0;
    let telefonsuzToplam = 0;
    const davetUlasmayanToplam: string[] = [];
    const PARCA_GRUP = 20;

    for (const g of gruplar) {
      const { data } = await db
        .from("participants")
        .select("id, full_name, phone, login_code, team")
        .eq("role", "participant")
        .eq("team", g.takim);
      const kisiler = (data ?? []) as Kisi[];
      const gecerli = kisiler.filter((k) => whatsAppAdresi(k.phone) !== null);
      const telefonsuz = kisiler.length - gecerli.length;

      let basarili = 0;
      let basarisiz = 0;
      // Grubun İLK gerçek Twilio hatası — admin panelde görünür ki başarısızlık
      // bir daha asla sebepsiz/kör kalmasın (canlıdaki %100 düşüş teşhis edilemedi).
      let hataOrnegi: string | undefined;
      for (let i = 0; i < gecerli.length; i += PARCA_GRUP) {
        const dilim = gecerli.slice(i, i + PARCA_GRUP);
        const sonuclar = await Promise.all(
          dilim.map((k) =>
            whatsAppGonderDetayli(
              k.phone!,
              contentSid!,
              degiskenleriUret(sablon, { ad: k.full_name, kod: k.login_code }, g.mesaj)
            )
          )
        );
        sonuclar.forEach((s, j) => {
          if (s.ok) basarili++;
          else {
            basarisiz++;
            davetUlasmayanToplam.push(dilim[j].full_name);
            if (!hataOrnegi && s.hata) hataOrnegi = s.hata;
          }
        });
      }

      detay.push({ takim: g.takim, basarili, basarisiz, telefonsuz, hataOrnegi });
      basariliToplam += basarili;
      basarisizToplam += basarisiz;
      telefonsuzToplam += telefonsuz;
    }

    await yazAuditLog(db, null, "whatsapp_gonderim", {
      sablon: sablon.anahtar,
      hedefTipi: "gruplar",
      gruplar: gruplar.map((g: { takim: string }) => g.takim),
      basarili: basariliToplam,
      basarisiz: basarisizToplam,
      telefonsuz: telefonsuzToplam,
      davetUlasmayan: davetUlasmayanToplam,
      hataOrnekleri: detay.filter((d) => d.hataOrnegi).map((d) => `${d.takim}: ${d.hataOrnegi}`),
    });

    return Response.json({
      ok: true,
      basarili: basariliToplam,
      basarisiz: basarisizToplam,
      telefonsuz: telefonsuzToplam,
      davetUlasmayan: davetUlasmayanToplam,
      detay,
    });
  }

  // Serbest metinli duyuruda mesaj zorunlu.
  const mesaj = typeof body?.mesaj === "string" ? body.mesaj.trim().slice(0, 600) : "";
  if (sablon.serbestMi && !mesaj) {
    return Response.json({ hata: t.api.mesajBos }, { status: 400 });
  }

  // Hedef kitleyi sunucuda taze çöz (istemciye güvenilmez).
  const alanlar = "id, full_name, phone, login_code, team";
  let kisiler: Kisi[] = [];

  if (body?.hedefTipi === "genel") {
    const { data } = await db.from("participants").select(alanlar).eq("role", "participant");
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "takim") {
    const takim = typeof body?.takim === "string" ? body.takim : "";
    if (!takim) return Response.json({ hata: t.api.takimYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .eq("team", takim);
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "kisiler") {
    const idler = Array.isArray(body?.kisiIds) ? body.kisiIds.filter((x: unknown) => typeof x === "string") : [];
    if (idler.length === 0) return Response.json({ hata: t.api.kisiYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .in("id", idler);
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "odevYapmayan") {
    // Sistemde bekleyen (pending) görevi olan herkes.
    const { data: bekleyen } = await db
      .from("missions")
      .select("participant_id")
      .eq("status", "pending");
    const idler = [...new Set((bekleyen ?? []).map((m) => m.participant_id))];
    if (idler.length === 0) return Response.json({ hata: t.api.odevYok }, { status: 400 });
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .in("id", idler);
    kisiler = (data ?? []) as Kisi[];
  } else if (body?.hedefTipi === "girisYapmamis") {
    // Henüz hiç giriş yapmamış (first_login_at NULL) katılımcılar.
    const { data } = await db
      .from("participants")
      .select(alanlar)
      .eq("role", "participant")
      .is("first_login_at", null);
    kisiler = (data ?? []) as Kisi[];
    if (kisiler.length === 0) return Response.json({ hata: "Tüm katılımcılar zaten giriş yaptı." }, { status: 400 });
  } else {
    return Response.json({ hata: t.api.hedefYok }, { status: 400 });
  }

  // Telefonu geçerli olanlara gönder; geçersiz/eksik telefonları atla.
  const gecerli = kisiler.filter((k) => whatsAppAdresi(k.phone) !== null);
  const telefonsuz = kisiler.length - gecerli.length;

  // "giris" daveti artık TEK mesajdır (kullanıcı kararı): davet (marketing)
  // şablonu GÖNDERİLMEZ; yalnız onaylı AUTHENTICATION/OTP kod şablonu gider —
  // linksiz, kopyalanabilir kamp kodu. (Kodu davet gövdesine koymak Meta'da
  // imkânsızdı; iki ayrı mesaj da kafa karıştırıyordu.)
  const sadeceKod = sablon.anahtar === "giris";
  let kodSid: string | null = null;
  if (sadeceKod) {
    const { data } = await db.from("settings").select("value").eq("key", "wa_tpl_kod").maybeSingle();
    kodSid = data?.value || null;
    if (!kodSid) {
      return Response.json({ hata: tr.admin.whatsapp.kodSablonKayitsiz }, { status: 400 });
    }
  }

  let basarili = 0;
  let basarisiz = 0;
  // [M1] Kişi bazlı teslim doğrulaması: mesaj kime ULAŞMADI — admin bu
  // isimleri görüp WhatsApp'tan elle takip eder (toplam sayı yetmiyordu).
  const davetUlasmayan: string[] = [];
  // Twilio hız sınırını zorlamamak için küçük gruplar halinde gönder.
  const PARCA = 20;
  for (let i = 0; i < gecerli.length; i += PARCA) {
    const dilim = gecerli.slice(i, i + PARCA);
    const sonuclar = await Promise.all(
      dilim.map((k) =>
        sadeceKod
          ? // Kod (OTP) şablonu — ContentVariables {"1": kod}.
            whatsAppGonder(k.phone!, kodSid!, { "1": k.login_code })
          : whatsAppGonder(
              k.phone!,
              contentSid!,
              degiskenleriUret(sablon, { ad: k.full_name, kod: k.login_code }, mesaj)
            )
      )
    );
    sonuclar.forEach((ok, j) => {
      if (ok) basarili++;
      else {
        basarisiz++;
        davetUlasmayan.push(dilim[j].full_name);
      }
    });
  }

  // [M1] Denetim izi: hangi şablon kaç kişiye gitti, kimlere ulaşmadı.
  await yazAuditLog(db, null, "whatsapp_gonderim", {
    sablon: sablon.anahtar,
    hedefTipi: body?.hedefTipi,
    basarili,
    basarisiz,
    telefonsuz,
    ...(sadeceKod ? { sadeceKod: true } : {}),
    davetUlasmayan,
  });

  return Response.json({
    ok: true,
    basarili,
    basarisiz,
    telefonsuz,
    davetUlasmayan,
  });
}
