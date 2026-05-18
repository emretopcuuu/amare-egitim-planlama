#!/usr/bin/env python3
"""
Tum videolar icin AI analiz (ahaMoments + chapters + ozet) toplu uret.
=============================================================================
NE YAPAR:
  - kayitli_egitimler/{vimeoId} dokunda transcriptChunks olan tum videolari tarar
  - Her video icin kayitli_egitimler/{vimeoId}/ai_analiz/main yazar
  - Mevcut PROMPT_VERSION >= 3 olan analiz dokunulanlar ATLANIR (idempotent)
  - LLM: OpenRouter (Gemini 2.5 Flash) - .env'den OPENROUTER_API_KEY okur
  - Whisper Turkce hatalarini AI temizler (sitres->stres, ciharet->ticaret)
  - Chapter'lar tum video suresini kapsar
  - Aha quote'lari her yerde temiz Turkce olur

NEDEN:
  - Mevcut sistemde her video acildiginda AI tetiklenir, kullanici 10sn bekler
  - Toplu sefirde cache'i doldurursak: butun videolar acildigi anda hazir gelir
  - Topulugun Favorileri, BugununIlhami, EgitmenSozleri vs hep dolu olur
  - Cost: ~$3-4 toplam (2000 video x Gemini Flash)

KULLANIM:
  cd scripts
  python batch_ai_analiz.py --limit=5         # ilk 5 video test
  python batch_ai_analiz.py --concurrency=5   # 5 paralel
  python batch_ai_analiz.py                   # hepsi (varsayilan 3 paralel)
  python batch_ai_analiz.py --force           # cache dolsa bile yeniden uret

PARAMETRELER:
  --limit=N         Sadece ilk N videoyu isle
  --concurrency=N   N paralel istek (default 3, max 10)
  --force           PROMPT_VERSION check'i atla, hepsini yeniden uret
  --only-vimeo-ids  Virgulle ayrilmis vimeo id listesi

HIZ:
  - Her cagri ~8-12sn
  - 3 paralel ile ~2-3 video/saniye/dakika = 60-100/dk
  - 2000 video / 80 = ~25 dakika
=============================================================================
"""
import os, sys, json, time, argparse, asyncio
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

try:
    import aiohttp
    import firebase_admin
    from firebase_admin import credentials, firestore
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Eksik paket: {e.name}")
    print("Yuklemek icin: pip install aiohttp firebase-admin python-dotenv")
    sys.exit(1)

load_dotenv(Path(__file__).parent / '.env')

# ─── Firebase init ─────────────────────────────────────────────────────
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

# ─── Config ────────────────────────────────────────────────────────────
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY')
if not OPENROUTER_KEY:
    print("HATA: OPENROUTER_API_KEY .env'de yok")
    sys.exit(1)

OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'google/gemini-2.5-flash')
PROMPT_VERSION = 3  # ai-transcript-analiz.mjs ile ayni

SISTEM_PROMPT = """Sen Dogrudan Satis / liderlik egitim videolarini analiz eden bir uzmansin.
Turkce transcript verilir, 3 CIKTI uretirsin (sadece JSON):

{
  "ahaMoments": [
    { "start": 142.5, "text": "Tam alinti 50-200 char", "sebep": "Neden onemli (10-25 kelime)" }
  ],
  "chapters": [
    { "start": 0, "baslik": "5-12 kelime bolum basligi" }
  ],
  "ozet": {
    "kisa": "3 cumle ozet (max 250 char)",
    "uzun": "1 paragraf detay (max 600 char)",
    "anaTema": "1 kelime ana tema (orn: liderlik, satis, motivasyon)"
  }
}

KURALLAR:
- ahaMoments: 3-5 adet, gercekten dusunduruculu/guclu alintilar. Soru cumlesi degil, ifade.
  ahaMoments TUM VIDEO BOYUNCA dagilmali (basi, ortasi, sonu).

- ONEMLI - TRANSCRIPT TEMIZLIGI:
  Transcript Whisper ile uretildi. Turkcede yaygin hatalar yapiyor:
  "sitres" -> "stres", "ciharet" -> "ticaret", "mademleri" -> "maddemiz",
  "baspiliyor" -> "basliyor", "Burken" -> "Buradan", "menum" -> "benim" vb.
  ahaMoments[].text alanini yazarken:
  - Anlami koruyarak Whisper hatalarini DUZELT (yazim, kelime hatalari)
  - Konusmacinin uslubunu BOZMA
  - Sonuc DOGRU Turkce akici bir alinti olmali

- chapters: 5-10 adet, videoyu mantiksal parcalara bol. Her chapter min 60sn olmali.
  COK ONEMLI: chapters TUM VIDEO SURESINI KAPSAMALI. Son chapter videonun son %15'inde olmali.
- chapters[0].start her zaman 0
- ozet.anaTema: liderlik, satis, motivasyon, kisisel gelisim, vizyon, saglik, urun, vb
- MARKA: "network marketing" terimini ASLA kullanma. Her zaman "Dogrudan Satis" yaz.
- Sadece JSON yaz, hicbir aciklama EKLEME."""

# ─── LLM call ──────────────────────────────────────────────────────────
async def llm_call(session, prompt):
    async with session.post(
        'https://openrouter.ai/api/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {OPENROUTER_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
            'X-Title': 'One Team Education',
        },
        json={
            'model': OPENROUTER_MODEL,
            'messages': [
                {'role': 'system', 'content': SISTEM_PROMPT},
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.3,
            'max_tokens': 4000,
            'response_format': {'type': 'json_object'},
        },
        timeout=aiohttp.ClientTimeout(total=60),
    ) as res:
        if res.status != 200:
            err = await res.text()
            raise Exception(f"OpenRouter {res.status}: {err[:200]}")
        data = await res.json()
        text = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        # Find JSON block
        import re
        match = re.search(r'\{[\s\S]*\}', text)
        if not match:
            raise Exception(f"JSON yok: {text[:100]}")
        return json.loads(match.group(0))

# ─── Metin temizle (Doğrudan Satış yedek) ──────────────────────────────
def metin_temizle(s):
    if not isinstance(s, str): return s
    import re
    s = re.sub(r'NETWORK\s*MARKETING', 'DOĞRUDAN SATIŞ', s)
    s = re.sub(r'Network\s*Marketing', 'Doğrudan Satış', s)
    s = re.sub(r'network\s*marketing', 'Doğrudan Satış', s, flags=re.IGNORECASE)
    return s

def temizle_deep(obj):
    if obj is None: return obj
    if isinstance(obj, str): return metin_temizle(obj)
    if isinstance(obj, list): return [temizle_deep(x) for x in obj]
    if isinstance(obj, dict): return {k: temizle_deep(v) for k, v in obj.items()}
    return obj

# ─── Tek video isle ────────────────────────────────────────────────────
async def video_isle(session, vid, sayac_dict):
    try:
        # 1. Cache kontrolu
        ai_ref = db.document(f'kayitli_egitimler/{vid}/ai_analiz/main')
        ai_snap = ai_ref.get()
        if ai_snap.exists and not sayac_dict['force']:
            existing = ai_snap.to_dict()
            ver = existing.get('promptVersion', 1)
            if ver >= PROMPT_VERSION:
                sayac_dict['atlanan'] += 1
                return f"  ATLA {vid} (v{ver} zaten guncel)"

        # 2. Video data + transcript chunks
        v_snap = db.document(f'kayitli_egitimler/{vid}').get()
        if not v_snap.exists:
            sayac_dict['hata'] += 1
            return f"  HATA {vid}: doc yok"
        v = v_snap.to_dict()
        chunks = v.get('transcriptChunks') or []
        if not chunks:
            sayac_dict['atlanan'] += 1
            return f"  ATLA {vid}: chunk yok"

        # 3. Prompt hazirla
        transcript = '\n'.join(
            f"[{int(c.get('start') or 0)}s] {c.get('text') or ''}" for c in chunks
        )
        FULL_LIMIT = 200000
        if len(transcript) > FULL_LIMIT:
            bas = transcript[:int(FULL_LIMIT * 0.4)]
            son = transcript[-int(FULL_LIMIT * 0.4):]
            orta = transcript[int(FULL_LIMIT * 0.4):-int(FULL_LIMIT * 0.4)]
            orta_satirlar = orta.split('\n')
            adim = max(1, len(orta_satirlar) // int(FULL_LIMIT * 0.2 / 50))
            orta_sampled = '\n'.join(orta_satirlar[::adim])
            transcript = f"{bas}\n[... orta seyreltildi ...]\n{orta_sampled}\n{son}"

        sure_sn = int(v.get('sure') or 0)
        sure_min = sure_sn // 60
        son_chunk_sn = int(chunks[-1].get('start') or sure_sn)
        son_chapter_min = int(son_chunk_sn * 0.85 / 60)

        prompt = f"""Video: {v.get('baslik') or ''}
Egitmenler: {', '.join(v.get('egitmenAdlari') or [])}
Kategoriler: {', '.join(v.get('kategoriler') or [])}
TOPLAM SURE: {sure_min} dakika ({sure_sn} saniye)
Son transcript chunk: {son_chunk_sn // 60}:{str(son_chunk_sn % 60).zfill(2)}

UYARI: Chapters TUM VIDEOYU kapsamali. Son chapter en gec {son_chapter_min}. dakikada baslamali.

Transcript ([saniye] text formatinda):
{transcript}

3 CIKTI uret: ahaMoments + chapters + ozet (sistem prompt'taki format).
HATIRLAT: chapters videonun BASINDAN SONUNA kadar dagilmali, yarida kesme."""

        # 4. LLM
        t0 = time.time()
        sonuc = await llm_call(session, prompt)
        sure = time.time() - t0

        # 5. Validate
        if not isinstance(sonuc.get('ahaMoments'), list): sonuc['ahaMoments'] = []
        if not isinstance(sonuc.get('chapters'), list): sonuc['chapters'] = []
        sonuc = temizle_deep(sonuc)

        # 6. Firestore yaz
        ai_ref.set({
            **sonuc,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'model': OPENROUTER_MODEL,
            'chunksCount': len(chunks),
            'promptVersion': PROMPT_VERSION,
        })

        sayac_dict['basarili'] += 1
        ah = len(sonuc.get('ahaMoments', []))
        ch = len(sonuc.get('chapters', []))
        return f"  OK   {vid} | {sure:.1f}s | aha={ah} ch={ch} | {(v.get('baslik') or '')[:50]}"

    except Exception as e:
        sayac_dict['hata'] += 1
        return f"  HATA {vid}: {str(e)[:120]}"

# ─── Main ──────────────────────────────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--concurrency', type=int, default=3)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--only-vimeo-ids', default='')
    args = parser.parse_args()

    concurrency = max(1, min(args.concurrency, 10))

    # Video listesi
    print("Firestore'dan transcriptVar=true videolari okunuyor...", flush=True)
    if args.only_vimeo_ids:
        ids = [x.strip() for x in args.only_vimeo_ids.split(',') if x.strip()]
        videos = ids
    else:
        # Direkt collection scan (transcriptVar=true + kayeneFiltrelendi=false)
        snap = db.collection('kayitli_egitimler') \
            .where(filter=firestore.FieldFilter('transcriptVar', '==', True)) \
            .where(filter=firestore.FieldFilter('kayeneFiltrelendi', '==', False)) \
            .select(['vimeoId']) \
            .stream()
        videos = []
        for d in snap:
            data = d.to_dict()
            vid = data.get('vimeoId') or d.id
            videos.append(vid)

    if args.limit > 0:
        videos = videos[:args.limit]

    toplam = len(videos)
    print(f"Toplam: {toplam} video | Concurrency: {concurrency} | Force: {args.force}\n", flush=True)
    print(f"Tahmini sure: {toplam * 10 / concurrency / 60:.1f} dakika\n", flush=True)

    sayac = {'basarili': 0, 'atlanan': 0, 'hata': 0, 'force': args.force}
    bas_zaman = time.time()

    async with aiohttp.ClientSession() as session:
        semaphore = asyncio.Semaphore(concurrency)

        async def isle_with_sem(vid, idx):
            async with semaphore:
                sonuc = await video_isle(session, vid, sayac)
                gecen = time.time() - bas_zaman
                hiz = (idx + 1) / gecen if gecen > 0 else 0
                kalan = (toplam - idx - 1) / hiz if hiz > 0 else 0
                print(f"[{idx+1}/{toplam} | ETA {kalan/60:.1f}dk] {sonuc}", flush=True)

        tasks = [isle_with_sem(vid, i) for i, vid in enumerate(videos)]
        await asyncio.gather(*tasks)

    sure_dk = (time.time() - bas_zaman) / 60
    print(f"\n{'='*60}", flush=True)
    print(f"BITTI - {sure_dk:.1f} dakika", flush=True)
    print(f"  Basarili: {sayac['basarili']}", flush=True)
    print(f"  Atlandi : {sayac['atlanan']}", flush=True)
    print(f"  Hata    : {sayac['hata']}", flush=True)
    print(f"{'='*60}", flush=True)

if __name__ == '__main__':
    asyncio.run(main())
