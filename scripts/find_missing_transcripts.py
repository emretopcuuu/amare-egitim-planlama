#!/usr/bin/env python3
"""
Hangi videolarda transcriptChunks eksik bul.
Sonuç: scripts/missing_transcripts.json + ekrana liste.

Kullanım:
  cd scripts
  python find_missing_transcripts.py
"""
import os, sys, json
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Env yükle
load_dotenv(Path(__file__).parent / '.env')

# Firebase init
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

print("Firestore'dan kayitli_egitimler okunuyor (kayene degil)...", flush=True)
docs = db.collection('kayitli_egitimler') \
    .where('kayeneFiltrelendi', '==', False) \
    .stream()

toplam = 0
transcriptliVar = 0
chunksliVar = 0
eksikChunks = []  # transcript var ama transcriptChunks yok
hicTranscriptYok = []

for doc in docs:
    toplam += 1
    d = doc.to_dict()
    transcript_raw = d.get('transcript')
    has_transcript = bool(transcript_raw and str(transcript_raw).strip())
    has_chunks = bool(d.get('transcriptChunks'))

    if has_transcript:
        transcriptliVar += 1
    if has_chunks:
        chunksliVar += 1

    if not has_chunks:
        info = {
            'id': doc.id,
            'vimeoId': d.get('vimeoId'),
            'baslik': d.get('baslik', '')[:80],
            'sure': d.get('sure', 0),
            'hasTranscript': has_transcript,
        }
        if has_transcript:
            eksikChunks.append(info)
        else:
            hicTranscriptYok.append(info)

print(f"\n{'='*70}", flush=True)
print(f"SONUC", flush=True)
print(f"  Toplam aktif video:      {toplam}", flush=True)
print(f"  Transcript (duz) olan:   {transcriptliVar}", flush=True)
print(f"  transcriptChunks olan:   {chunksliVar}", flush=True)
print(f"  Eksik (chunks yok):      {len(eksikChunks) + len(hicTranscriptYok)}", flush=True)
print(f"    - Sadece chunks eksik: {len(eksikChunks)}", flush=True)
print(f"    - Hic transcript yok:  {len(hicTranscriptYok)}", flush=True)
print(f"{'='*70}\n", flush=True)

if eksikChunks:
    print("CHUNKS EKSIK (transcript var ama chunks yok):", flush=True)
    for v in eksikChunks[:20]:
        print(f"  {v['vimeoId']:>12} | {v['sure']//60:>4}dk | {v['baslik']}", flush=True)
    if len(eksikChunks) > 20:
        print(f"  ... +{len(eksikChunks)-20} daha", flush=True)
    print('', flush=True)

if hicTranscriptYok:
    print("HIC TRANSCRIPT YOK:", flush=True)
    for v in hicTranscriptYok[:20]:
        print(f"  {v['vimeoId']:>12} | {v['sure']//60:>4}dk | {v['baslik']}", flush=True)
    if len(hicTranscriptYok) > 20:
        print(f"  ... +{len(hicTranscriptYok)-20} daha", flush=True)
    print('', flush=True)

# JSON kaydet
out = {
    'toplam': toplam,
    'transcriptliVar': transcriptliVar,
    'chunksliVar': chunksliVar,
    'eksikChunks': eksikChunks,
    'hicTranscriptYok': hicTranscriptYok,
}
out_path = Path(__file__).parent / 'missing_transcripts.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"Detay JSON: {out_path}", flush=True)

# Yeniden işlem için komut öneri
if eksikChunks or hicTranscriptYok:
    eksik_ids = [v['vimeoId'] for v in (eksikChunks + hicTranscriptYok)]
    print(f"\nYeniden islemek icin (--only-vimeo-ids flag'i eklenmedi henuz):", flush=True)
    print(f"  Eksik vimeo ID'leri ({len(eksik_ids)}):", flush=True)
    for vid in eksik_ids[:11]:
        print(f"    {vid}", flush=True)
