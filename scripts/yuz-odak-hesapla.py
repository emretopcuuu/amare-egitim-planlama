#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Egitmen fotograflarinda yuz odak noktalarini hesaplar -> src/data/yuzOdak.json

NE ISE YARAR
  Avatarlar daire icinde `object-cover` ile kirpiliyor. Sabit bir hizalama
  (eskiden `center 25%`) fotograftan fotografa tutmuyordu: kiminde cene
  kesiliyor, kiminde sadece alin goruntuleniyordu. Bu betik her fotografta
  yuzu bulur ve CSS `object-position` icin yuzde degeri uretir.

NE ZAMAN CALISTIRILIR
  Yeni egitmen fotografi eklendiginde veya mevcut fotograf degistiginde.
  Listede olmayan kayit eski sabit davranisa duser, yani arayuz bozulmaz.

KURULUM
  pip install opencv-python-headless
  Model (~230KB) ilk calistirmada otomatik indirilir.

KULLANIM
  python scripts/yuz-odak-hesapla.py
"""

import json, io, os, urllib.request, urllib.parse, tempfile
import cv2

PROJE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GECICI = os.path.join(tempfile.gettempdir(), 'oneteam-yuz-odak')
os.makedirs(GECICI, exist_ok=True)

MODEL_URL = ('https://github.com/opencv/opencv_zoo/raw/main/models/'
             'face_detection_yunet/face_detection_yunet_2023mar.onnx')
TEMEL = ('https://firestore.googleapis.com/v1/projects/amare-egitim-planlama'
         '/databases/(default)/documents/konusmacilar')


def konusmacilariCek():
    """Firestore REST (public okuma) -> fotografi olan kayitlar."""
    kayitlar, token = [], None
    while True:
        p = {'pageSize': '300'}
        if token:
            p['pageToken'] = token
        with urllib.request.urlopen(TEMEL + '?' + urllib.parse.urlencode(p), timeout=60) as r:
            d = json.loads(r.read().decode('utf-8'))
        for doc in d.get('documents', []):
            f = doc.get('fields', {})
            url = f.get('fotoURL', {}).get('stringValue')
            if url:
                kayitlar.append({'id': doc['name'].split('/')[-1],
                                 'ad': f.get('ad', {}).get('stringValue', ''),
                                 'url': url})
        token = d.get('nextPageToken')
        if not token:
            return kayitlar


# Her konusmaci fotografinda yuzu bul, dairede ortalanacak objectPosition hesapla.
#
# Neden gerekli: arayuzde herkese SABIT `objectPosition: center 25%` uygulaniyordu
# ("yuz genelde ust ceyrektedir" tahmini, Mayis 2026). Yakin cekimde cene kesiliyor,
# genis cekimde yuz yukarida kaliyor, yatay fotografta tamamen sasiyordu.
#
# Yontem: OpenCV YuNet (DNN tabanli yuz algilayici). Haar cascade OpenCV 5'te
# kaldirildi; YuNet zaten daha isabetli. Yuz kutusunun merkezi bulunur, goz hatti
# biraz yukarida hos durdugu icin merkez yuz yuksekliginin %8'i kadar yukari cekilir.
# Sonuc yuzde olarak yazilir; CSS object-position tam da bunu bekler.

INDIR = os.path.join(GECICI, 'fotolar')
MODEL = os.path.join(GECICI, 'yunet.onnx')
CIKTI = os.path.join(PROJE, 'src', 'data', 'yuzOdak.json')
os.makedirs(INDIR, exist_ok=True)

if not os.path.exists(MODEL):
    print('YuNet modeli indiriliyor...')
    urllib.request.urlretrieve(MODEL_URL, MODEL)

kayitlar = konusmacilariCek()
print('fotografli konusmaci:', len(kayitlar))
sonuc, basarisiz = {}, []

def indir(k):
    yol = os.path.join(INDIR, k['id'] + '.img')
    if os.path.exists(yol) and os.path.getsize(yol) > 500:
        return yol
    try:
        istek = urllib.request.Request(k['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(istek, timeout=45) as r, open(yol, 'wb') as f:
            f.write(r.read())
        return yol
    except Exception:
        return None

def yuzBul(im, esik):
    H, W = im.shape[:2]
    d = cv2.FaceDetectorYN_create(MODEL, '', (W, H), esik, 0.3, 5000)
    d.setInputSize((W, H))
    _, yuzler = d.detect(im)
    return yuzler if yuzler is not None else []

for i, k in enumerate(kayitlar, 1):
    yol = indir(k)
    if not yol:
        basarisiz.append((k['id'], 'indirilemedi')); continue
    try:
        im = cv2.imread(yol)
        if im is None:
            basarisiz.append((k['id'], 'okunamadi')); continue
        H, W = im.shape[:2]
        # Once normal esikle, bulunamazsa gevset: bazi fotograflar dusuk isikli
        yuzler = yuzBul(im, 0.6)
        if len(yuzler) == 0:
            yuzler = yuzBul(im, 0.3)
        if len(yuzler) == 0:
            basarisiz.append((k['id'], 'yuz-yok')); continue
        # Birden fazla yuz varsa en buyugu (ana portre)
        y = max(yuzler, key=lambda r: r[2] * r[3])
        x, yy, w, h = float(y[0]), float(y[1]), float(y[2]), float(y[3])
        mx = x + w / 2
        my = yy + h / 2 - h * 0.08
        sonuc[k['id']] = [
            round(max(0, min(100, mx / W * 100)), 1),
            round(max(0, min(100, my / H * 100)), 1),
        ]
    except Exception as e:
        basarisiz.append((k['id'], str(e)[:40]))
    if i % 40 == 0:
        print(f'  {i}/{len(kayitlar)}', flush=True)

os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
io.open(CIKTI, 'w', encoding='utf-8').write(
    json.dumps(sonuc, ensure_ascii=False, separators=(',', ':'), sort_keys=True))
print('yazildi:', CIKTI)
print('toplam:', len(kayitlar), '| yuz bulundu:', len(sonuc), '| bulunamadi:', len(basarisiz))
for b in basarisiz[:15]:
    print('  -', b[0], b[1])
