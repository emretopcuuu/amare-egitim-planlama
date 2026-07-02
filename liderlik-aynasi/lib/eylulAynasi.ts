import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { halkaDurumu } from "@/lib/halka";
import { zincirDurumu } from "@/lib/muhurZinciri";
import { isVerisiDurumu } from "@/lib/isVerisi";

// [5.2] EYLÜL AYNASI (mini-360) — kişinin 2 aylık yolculuğunun özeti + tek cümle
// yansıma + 0-10 puan. Kamp mühründen bu yana "before/after" ölçümü.

export type EylulOzet = {
  halkaDolan: number;
  muhurTeyit: number; // ara mühür zincirinde teyit edilen halka sayısı
  kivilcim: number;
  redSayisi: number;
  isToplam: { gorusme: number; kayit: number; takip: number };
};

export type EylulKayit = { cevap: string; puan: number } | null;

export async function eylulOzet(db: Db, pid: string): Promise<EylulOzet> {
  const [halka, zincir, isv, sparkRes, redRes] = await Promise.all([
    halkaDurumu(db, pid),
    zincirDurumu(db, pid),
    isVerisiDurumu(db, pid),
    db.from("missions").select("spark_points").eq("participant_id", pid),
    db.from("redler").select("id", { count: "exact", head: true }).eq("participant_id", pid),
  ]);

  const kivilcim = (sparkRes.data ?? []).reduce((a, m) => a + (m.spark_points ?? 0), 0);
  const muhurTeyit = zincir.halkalar.filter((h) => h.teyit).length;

  return {
    halkaDolan: halka.dolan,
    muhurTeyit,
    kivilcim,
    redSayisi: redRes.count ?? 0,
    isToplam: isv.toplam,
  };
}

export async function eylulKayitGetir(db: Db, pid: string): Promise<EylulKayit> {
  const { data } = await db
    .from("eylul_aynasi")
    .select("cevap, puan")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data) return null;
  return { cevap: data.cevap, puan: data.puan };
}

export async function eylulAynasiAcikMi(db: Db): Promise<boolean> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "eylul_kanit_modu")
    .maybeSingle();
  return data?.value === "true";
}

export async function eylulKayitEt(
  db: Db,
  pid: string,
  cevap: string,
  puan: number
): Promise<{ ok: boolean; sebep?: string }> {
  const temiz = (cevap ?? "").trim().slice(0, 800);
  const p = Math.round(Number(puan));
  if (!temiz) return { ok: false, sebep: "bos" };
  if (!Number.isFinite(p) || p < 0 || p > 10) return { ok: false, sebep: "puan" };
  const { error } = await db.from("eylul_aynasi").upsert(
    { participant_id: pid, cevap: temiz, puan: p, created_at: new Date().toISOString() },
    { onConflict: "participant_id" }
  );
  return error ? { ok: false, sebep: "hata" } : { ok: true };
}
