#!/usr/bin/env python3
"""
Transcript üretilemeyen videoları işaretle.
Sebep: Vimeo'da yok / sessiz / çok kısa.

- transcriptChunks: [] (boş array)
- transcriptYok: true
- transcriptYokSebep: 'vimeo_404' | 'sessiz' | 'cok_kisa'

Sonuç: batch_whisper_chunks.py bunları idempotent atlar (chunks array non-empty
değil ama "yok" flag'i ile ayırt edilir).
"""
import os, sys
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

if not firebase_admin._apps:
    cred = credentials.Certificate({
        'type': 'service_account',
        'project_id': os.environ['FIREBASE_PROJECT_ID'],
        'private_key': os.environ['FIREBASE_PRIVATE_KEY'].replace('\\n', '\n'),
        'client_email': os.environ['FIREBASE_CLIENT_EMAIL'],
        'token_uri': 'https://oauth2.googleapis.com/token',
    })
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Hata sebeplerine göre vimeo ID'leri
HATALI = {
    'vimeo_404': ['1048363062', '1179495967', '142376222', '146153126'],
    'sessiz_bos': ['134590789', '256186430', '325064818', '467031291', '529333954'],
}

print("9 problematik videoyu Firestore'da isaretliyorum...", flush=True)

for sebep, vimeo_ids in HATALI.items():
    for vid in vimeo_ids:
        # vimeoId ile doc bul
        docs = db.collection('kayitli_egitimler') \
            .where(filter=firestore.FieldFilter('vimeoId', '==', vid)) \
            .limit(1).stream()
        bulundu = False
        for doc in docs:
            bulundu = True
            doc.reference.update({
                'transcriptYok': True,
                'transcriptYokSebep': sebep,
                'transcriptChunks': [],  # Boş ama set (idempotent skip için)
                'guncellemeTarihi': firestore.SERVER_TIMESTAMP,
            })
            d = doc.to_dict()
            print(f"  OK {vid} | {sebep:<11} | {d.get('baslik', '')[:60]}", flush=True)
        if not bulundu:
            print(f"  ?? {vid} | {sebep:<11} | DOC BULUNAMADI", flush=True)

print("\nBitti. 9 video isaretlendi. Yeniden whisper calistirilirsa atlanir.", flush=True)
