# Yuz odagi v2 — yuz MERKEZI degil, yuz KUTUSUNUN TAMAMI dairede kalsin.
#
# v1 yalnizca yuz merkezini ortaliyordu. Dikey fotograflarda (375x500) kare
# daire ustten/alttan kirpiyor; merkez dogru olsa bile cene veya alin disarida
# kaliyordu. Burada odak, yuz kutusunu gorunur pencereye SIKISTIRACAK sekilde
# sinirlaniyor.
#
# Geometri: daire kare bir alana ciziliyor, kare alan = min(W,H).
# object-position y% -> pencere ust kenari = (H - pencereYuk) * y/100
# Kisit: yuz kutusu (+pay) pencerenin icinde kalsin. Kisit saglanamiyorsa
# (yuz pencereden buyuk) merkeze en yakin degere duser.
import json, io, os, urllib.request
import cv2

KOK = os.path.dirname(os.path.abspath(__file__))
LISTE = os.path.join(KOK, 'konusmaci-fotolar.json')
INDIR = os.path.join(KOK, 'fotolar')
MODEL = os.path.join(KOK, 'model', 'yunet.onnx')
CIKTI = os.path.join(KOK, 'yuz-odak.json')
RAPOR = os.path.join(KOK, 'yuz-rapor.json')

# Daire kare alanin icine ciziliyor: kosaler kayboluyor. Yuzun daire kenarina
# degmemesi icin kare alanin %88'ini guvenli sayiyoruz.
GUVENLI = 0.88
# Yuzun etrafinda biraz nefes payi (sac + cene) — yuz yuksekliginin orani.
PAY_UST, PAY_ALT = 0.35, 0.22

kayitlar = json.load(io.open(LISTE, encoding='utf-8'))
sonuc, rapor, basarisiz = {}, {}, []


def eksen(uzunluk, pencere, kutuBas, kutuBoy, payBas, paySon):
    """Bir eksende object-position yuzdesi (0-100).
    uzunluk: fotografin o eksendeki boyu
    pencere: gorunur pencere boyu (kare alan * GUVENLI degil, tam pencere)
    """
    hareket = uzunluk - pencere          # pencerenin kayabilecegi mesafe
    if hareket <= 0:
        return 50.0                      # kirpma yok, konum onemsiz
    istenenBas = kutuBas - kutuBoy * payBas
    istenenSon = kutuBas + kutuBoy + kutuBoy * paySon
    merkez = (kutuBas + kutuBoy / 2) - pencere / 2    # merkezleyen ust kenar
    # Kutuyu tamamen icine alacak ust kenar araligi:
    altSinir = istenenSon - pencere      # bundan kucuk olursa alt kesilir
    ustSinir = istenenBas                # bundan buyuk olursa ust kesilir
    if altSinir <= ustSinir:
        konum = min(max(merkez, altSinir), ustSinir)   # aralik varsa sikistir
    else:
        konum = merkez                   # yuz pencereden buyuk: merkeze yakin
    konum = min(max(konum, 0), hareket)
    return round(konum / hareket * 100, 1)


def yuzBul(im, esik):
    H, W = im.shape[:2]
    d = cv2.FaceDetectorYN_create(MODEL, '', (W, H), esik, 0.3, 5000)
    d.setInputSize((W, H))
    _, y = d.detect(im)
    return y if y is not None else []


for i, k in enumerate(kayitlar, 1):
    yol = os.path.join(INDIR, k['id'] + '.img')
    if not os.path.exists(yol):
        basarisiz.append((k['id'], 'dosya-yok')); continue
    im = cv2.imread(yol)
    if im is None:
        basarisiz.append((k['id'], 'okunamadi')); continue
    H, W = im.shape[:2]
    yuzler = yuzBul(im, 0.6)
    if len(yuzler) == 0:
        yuzler = yuzBul(im, 0.3)
    if len(yuzler) == 0:
        basarisiz.append((k['id'], 'yuz-yok')); continue

    f = max(yuzler, key=lambda r: r[2] * r[3])
    fx, fy, fw, fh = (float(v) for v in f[:4])

    kare = min(W, H)                 # daire kare alana ciziliyor
    pencereW = min(W, kare)
    pencereH = min(H, kare)

    px = eksen(W, pencereW, fx, fw, 0.30, 0.30)
    py = eksen(H, pencereH, fy, fh, PAY_UST, PAY_ALT)
    sonuc[k['id']] = [px, py]

    # Yuzun guvenli daire alanina orani: 1'den buyukse fotograf asiri yakin.
    gerekli = fh * (1 + PAY_UST + PAY_ALT)
    rapor[k['id']] = {
        'foto': f'{W}x{H}',
        'yuzYukseklikYuzde': round(fh / H * 100),
        'sigmaOrani': round(gerekli / (pencereH * GUVENLI), 2),
    }
    if i % 50 == 0:
        print(f'  {i}/{len(kayitlar)}', flush=True)

io.open(CIKTI, 'w', encoding='utf-8').write(
    json.dumps(sonuc, ensure_ascii=False, separators=(',', ':'), sort_keys=True))
io.open(RAPOR, 'w', encoding='utf-8').write(
    json.dumps(rapor, ensure_ascii=False, indent=1, sort_keys=True))

sigmayan = sorted(((v['sigmaOrani'], k) for k, v in rapor.items() if v['sigmaOrani'] > 1.0), reverse=True)
print('yuz bulundu:', len(sonuc), '| bulunamadi:', len(basarisiz))
print('daireye sigmayacak kadar yakin cekim:', len(sigmayan))
for oran, kid in sigmayan[:12]:
    print(f'  {kid:28} oran {oran}  yuz %{rapor[kid]["yuzYukseklikYuzde"]} ({rapor[kid]["foto"]})')
