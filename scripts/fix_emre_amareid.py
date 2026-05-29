#!/usr/bin/env python3
"""
Emre'nin user doc'una amareId yaz - magic link flow disinda login olmus.
Email -> Supabase'den amareId -> Firestore'a yaz.
"""
import os, sys, json
from pathlib import Path
import urllib.request
import urllib.parse

os.environ['PYTHONIOENCODING'] = 'utf-8'

import firebase_admin
from firebase_admin import credentials, firestore, auth
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

EMAIL = 's.emretopcu@gmail.com'

# 1. Firebase Auth - user'ı email ile bul
print(f"1) Firebase Auth: {EMAIL} aranıyor...")
try:
    user = auth.get_user_by_email(EMAIL)
    uid = user.uid
    print(f"   UID: {uid}")
except Exception as e:
    print(f"   HATA: {e}")
    sys.exit(1)

# 2. Mevcut userDoc oku
print(f"\n2) users/{uid} oku...")
udoc = db.document(f'users/{uid}').get()
if udoc.exists:
    d = udoc.to_dict()
    print(f"   amareId: {d.get('amareId') or '(YOK)'}")
    print(f"   email: {d.get('email') or '(yok)'}")
    print(f"   displayName: {d.get('displayName') or '(yok)'}")
else:
    print("   doc YOK")

# 3. Supabase'den amareId bul
print(f"\n3) Supabase amare_raw_members'de {EMAIL} ara...")
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '') or os.environ.get('SUPABASE_SERVICE_KEY', '')
if not SUPABASE_URL or not SUPABASE_KEY:
    print("   HATA: SUPABASE_URL veya SUPABASE_KEY .env'de yok")
    sys.exit(1)

q = urllib.parse.urlencode({
    'select': 'amare_id,full_name,email',
    'email': f'eq.{EMAIL}',
    'limit': '5',
})
req = urllib.request.Request(
    f'{SUPABASE_URL}/rest/v1/amare_raw_members?{q}',
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        rows = json.loads(r.read().decode())
        if not rows:
            print(f"   HATA: {EMAIL} Supabase'de bulunamadı")
            sys.exit(1)
        for row in rows:
            print(f"   amare_id: {row.get('amare_id')} | full_name: {row.get('full_name')}")
        if len(rows) > 1:
            print("   UYARI: birden fazla kayıt var, ilkini kullanıyorum")
        amare_id = str(rows[0].get('amare_id'))
        full_name = rows[0].get('full_name')
except Exception as e:
    print(f"   HATA: {e}")
    sys.exit(1)

# 4. users doc'una yaz
print(f"\n4) users/{uid} doc'una amareId={amare_id} yaz...")
db.document(f'users/{uid}').set({
    'amareId': amare_id,
    'email': EMAIL,
    'displayName': full_name or 'Emre Topcu',
    'sonGiris': firestore.SERVER_TIMESTAMP,
}, merge=True)
print(f"   OK")

# 5. Dogrula
udoc2 = db.document(f'users/{uid}').get()
print(f"\n5) DOGRULA:")
print(f"   amareId: {udoc2.to_dict().get('amareId')}")
print(f"\nBitti. Sayfayi yenile.")
