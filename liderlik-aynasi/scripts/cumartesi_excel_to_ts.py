#!/usr/bin/env python3
"""Cumartesi PD101 Excel → lib/cumartesiProgrami.ts veri üretici.
Yeni Excel geldiğinde:  python3 scripts/cumartesi_excel_to_ts.py <xlsx>  → veri bloğu basar.
'Grup Programı' (per-grup zaman çizelgesi) + 'David Akışı' (seans→gruplar) okunur.
"""
import sys, re, openpyxl

TUR = {
    "David Hazırlık": "david_hazirlik",
    "David Toplantısı": "david_toplanti",
    "Bowling": "bowling",
    "Big Bubble": "big_bubble",
    "ATV": "atv",
    "Hazine Avı": "hazine_avi",
    "Öğle yemeği": "yemek",
}

def ilk_aralik(s):
    """'09:30–10:15' / '12:10–14:00 dönüşümlü…' / '12:00–12:30 + 13:15–14:00' → (bas,bit)."""
    s = s.replace("–", "-").replace("—", "-")
    m = re.search(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", s)
    if not m:
        return None
    def norm(x):
        h, mm = x.split(":"); return f"{int(h):02d}:{mm}"
    return norm(m.group(1)), norm(m.group(2))

def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    gp = wb["Grup Programı"]
    bloklar = []
    for row in gp.iter_rows(min_row=4, values_only=True):
        grup_s, saat, program, detay, _not = (row + (None,)*5)[:5]
        if not grup_s or not str(grup_s).startswith("Grup"):
            continue
        gm = re.match(r"Grup\s+(\d+)", str(grup_s))
        if not gm:
            continue
        grup = int(gm.group(1))
        ar = ilk_aralik(str(saat or ""))
        if not ar:
            continue
        prog = str(program or "").strip()
        tur = TUR.get(prog, "yemek" if "yemek" in prog.lower() else "diger")
        baslik = prog
        det = str(detay or "").strip()
        bloklar.append((grup, ar[0], ar[1], tur, baslik, det))
    bloklar.sort(key=lambda b: (b[0], b[1]))

    # David seansları (David Akışı sheet: "Sabah 1 | 09:30–10:15 | Grup 1 + Grup 6 + Grup 10")
    da = wb["David Akışı"]
    seanslar = []
    for row in da.iter_rows(values_only=True):
        cells = [("" if c is None else str(c)) for c in row]
        if len(cells) >= 3 and re.search(r"Grup\s+\d+\s*\+", cells[2]):
            ar = ilk_aralik(cells[1])
            gruplar = [int(x) for x in re.findall(r"Grup\s+(\d+)", cells[2])]
            if ar:
                seanslar.append((cells[0].strip(), ar[0], ar[1], gruplar))

    print("// ÜRETİLDİ: scripts/cumartesi_excel_to_ts.py — elle düzenleme, Excel'den yeniden üret.")
    print("export const CUMARTESI_PROGRAMI: CmtBlok[] = [")
    for g, b, bit, tur, baslik, det in bloklar:
        # David hazırlık bloğu kullanıcıya nazik metinle gösterilir (Excel'deki ham
        # "Üst baş / el yüz" yerine).
        if tur == "david_hazirlik":
            baslik, det = "David ile toplantı öncesi hazırlık", "Dress code: Smart Casual"
        d = f', detay: {det!r}' if det else ""
        print(f'  {{ grup: {g}, baslangic: "{b}", bitis: "{bit}", tur: "{tur}", baslik: {baslik!r}{d} }},')
    print("];")
    print()
    print("export const DAVID_SEANSLARI: DavidSeans[] = [")
    for ad, b, bit, gruplar in seanslar:
        print(f'  {{ ad: {ad!r}, baslangic: "{b}", bitis: "{bit}", gruplar: {gruplar} }},')
    print("];")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "cumartesi.xlsx")
