#!/usr/bin/env python3
"""
Whisper ile timestamp'li transcriptChunks üretir, Firestore'a ekler.
=============================================================================
GÜVENLİK GARANTİLERİ:
  - Mevcut `transcript` (düz metin) alanı KORUNUR, dokunulmaz
  - Sadece YENİ `transcriptChunks` alanı eklenir
  - Doc'ta zaten transcriptChunks varsa O VİDEO ATLANIR (idempotent)
  - kayeneFiltrelendi:true olanlar atlanır (sadece aktif ~919 video)
  - Ctrl+C ile durdurabilirsin, veri kaybı olmaz, yeniden çalıştırınca
    kaldığı yerden devam eder

KULLANIM:
  cd scripts
  pip install firebase-admin python-dotenv  # ilk kurulum (1 defa)
  python batch_whisper_chunks.py --limit=10          # test, 10 video
  python batch_whisper_chunks.py --limit=10 --model=tiny  # hızlı test
  python batch_whisper_chunks.py                     # tümü (~919 video)

PARAMETRELER:
  --limit=N       N video işle (default: tümü)
  --model=base    whisper modeli (tiny|base|small|medium|large, default: base)
  --dry-run       Firestore'a yazma, sadece dene
  --audio-dir=X   ses dosyalarının indirileceği klasör (default: ./whisper_audio)

HIZ TAHMİNİ (CPU, base model, ~30 dk video):
  - 1x realtime ≈ 30 dk işlem / video
  - 10 video ≈ 5 saat
  - 919 video ≈ ~19 gün (24/7) — GPU varsa ~3-5x hızlı

TAVSİYE: Önce --limit=10 ile test et, sonuçları gör, sonra büyüt.
=============================================================================
"""
import os, sys, json, time, argparse, subprocess
from pathlib import Path

# ─── UTF-8 stdout ───────────────────────────────────────────────────────
os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

# ─── Args ───────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='Whisper chunks backfill')
parser.add_argument('--limit', type=int, default=0, help='İşlenecek video sayısı (0=tümü)')
parser.add_argument('--model', default='base', choices=['tiny', 'base', 'small', 'medium', 'large'])
parser.add_argument('--dry-run', action='store_true', help='Firestore\'a yazma')
parser.add_argument('--audio-dir', default=None, help='Audio download klasörü')
parser.add_argument('--only-vimeo-ids', default=None,
    help='Sadece bu vimeo ID\'leri işle (virgül ile ayır, ör: 1048363062,1179495967)')
parser.add_argument('--force', action='store_true',
    help='transcriptChunks zaten varsa bile YENİDEN üret')
args = parser.parse_args()
ONLY_IDS = set(args.only_vimeo_ids.split(',')) if args.only_vimeo_ids else None

SCRIPT_DIR = Path(__file__).parent.resolve()
AUDIO_DIR = Path(args.audio_dir) if args.audio_dir else SCRIPT_DIR / 'whisper_audio'
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

print(f"\n[INIT] Audio dir: {AUDIO_DIR}", flush=True)

# ─── FFmpeg PATH ────────────────────────────────────────────────────────
try:
    import imageio_ffmpeg, shutil
    ffmpeg_src = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_src)
    for name in ['ffmpeg.exe', 'ffprobe.exe']:
        dst = os.path.join(ffmpeg_dir, name)
        if not os.path.exists(dst):
            shutil.copy2(ffmpeg_src, dst)
    os.environ['PATH'] = ffmpeg_dir + os.pathsep + os.environ.get('PATH', '')
    print(f"[INIT] FFmpeg: {ffmpeg_dir}", flush=True)
except Exception as e:
    print(f"[WARN] FFmpeg setup: {e}", flush=True)

# ─── .env yükle ─────────────────────────────────────────────────────────
from dotenv import load_dotenv
env_path = SCRIPT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"[INIT] .env yuklendi: {env_path}", flush=True)
else:
    load_dotenv()
    print(f"[WARN] {env_path} yok, default .env aranıyor", flush=True)

project_id = os.getenv('FIREBASE_PROJECT_ID')
client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
private_key = (os.getenv('FIREBASE_PRIVATE_KEY') or '').replace('\\n', '\n')

if not all([project_id, client_email, private_key]):
    print("[ERROR] Firebase env eksik. scripts/.env'de FIREBASE_* var mi?", flush=True)
    sys.exit(1)

# ─── Firebase ──────────────────────────────────────────────────────────
print("[INIT] Firebase Admin baslatiliyor...", flush=True)
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate({
    'type': 'service_account',
    'project_id': project_id,
    'client_email': client_email,
    'private_key': private_key,
    'token_uri': 'https://oauth2.googleapis.com/token',
})
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# ─── Whisper ────────────────────────────────────────────────────────────
print(f"[INIT] Whisper '{args.model}' modeli yukleniyor (ilk seferde indirir)...", flush=True)
import whisper
model = whisper.load_model(args.model)
print(f"[INIT] Whisper hazir!\n", flush=True)

# ─── Helpers ────────────────────────────────────────────────────────────
def get_candidates():
    print("[FIRESTORE] Aktif video listesi cekiliyor...", flush=True)
    docs = db.collection('kayitli_egitimler') \
        .where(filter=firestore.FieldFilter('kayeneFiltrelendi', '==', False)) \
        .stream()
    cands, skipped_have_chunks, skipped_no_vimeo, skipped_filter = [], 0, 0, 0
    for d in docs:
        data = d.to_dict()
        vimeo_id = data.get('vimeoId')
        # ONLY filter (sadece bu ID'leri al, gerisini atla)
        if ONLY_IDS is not None and str(vimeo_id) not in ONLY_IDS:
            skipped_filter += 1
            continue
        # Zaten chunks varsa atla (IDEMPOTENT) — --force ile bypass
        chunks_existing = data.get('transcriptChunks')
        if not args.force and isinstance(chunks_existing, list) and len(chunks_existing) > 0:
            skipped_have_chunks += 1
            continue
        # Manuel olarak "transcript yok" işaretliyse atla (vimeo 404, sessiz, vb)
        if not args.force and data.get('transcriptYok') is True:
            skipped_have_chunks += 1
            continue
        if not vimeo_id:
            skipped_no_vimeo += 1
            continue
        cands.append({
            'id': d.id,
            'vimeo_id': str(vimeo_id),
            'title': data.get('baslik', '') or '(başlıksız)',
            'link': data.get('vimeoUrl') or f"https://vimeo.com/{vimeo_id}",
            'sure': int(data.get('sure', 0) or 0),
        })
    print(f"[FIRESTORE] Toplam aday: {len(cands)} | Zaten chunks olan: {skipped_have_chunks} | Vimeo ID yok: {skipped_no_vimeo}\n", flush=True)
    return cands

def download_audio(vimeo_id, link):
    output = AUDIO_DIR / f"{vimeo_id}.m4a"
    if output.exists() and output.stat().st_size > 1024:
        return output
    cmd = [
        sys.executable, '-m', 'yt_dlp',
        '-f', 'bestaudio',
        '--no-warnings', '--quiet',
        '-o', str(output),
        link
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900,
                            encoding='utf-8', errors='replace')
    if result.returncode != 0:
        raise Exception(f"yt-dlp: {(result.stderr or '').strip()[:300]}")
    # yt-dlp bazen uzantı ekler
    if not output.exists():
        for ext in ['.m4a', '.mp4', '.webm', '.opus']:
            alt = output.with_suffix(output.suffix + ext)
            if alt.exists():
                alt.rename(output)
                break
    if not output.exists() or output.stat().st_size < 1024:
        raise Exception('Indirilen audio bos veya yok')
    return output

def transcribe_with_segments(audio_path):
    """Returns [{start, end, text}] — Firestore'a yazılacak format"""
    result = model.transcribe(str(audio_path), language='tr', fp16=False, verbose=False)
    chunks = []
    for seg in result.get('segments', []):
        text = (seg.get('text') or '').strip()
        if not text:
            continue
        chunks.append({
            'start': round(float(seg['start']), 1),
            'end':   round(float(seg['end']),   1),
            'text':  text,
        })
    return chunks

def merge_short_chunks(chunks, min_dur=1.5, max_dur=8.0):
    """Çok kısa chunk'ları birleştir (UI navigasyonu kolay olsun)."""
    if not chunks: return chunks
    out = [dict(chunks[0])]
    for c in chunks[1:]:
        last = out[-1]
        gap = c['start'] - last['end']
        if gap < 0.6 and (c['end'] - last['start']) < max_dur:
            last['end'] = c['end']
            last['text'] = last['text'] + ' ' + c['text']
        else:
            out.append(dict(c))
    return out

def save_to_firestore(doc_id, chunks):
    """
    GÜVENLİ UPDATE: Sadece transcriptChunks alanını set eder.
    Diğer alanlar (transcript, baslik, vs.) DOKUNULMAZ.
    """
    if not chunks:
        return False, 'bos chunks'
    payload_size = len(json.dumps(chunks, ensure_ascii=False).encode('utf-8'))
    if payload_size > 950_000:
        return False, f'cok buyuk ({payload_size//1024}KB)'
    db.collection('kayitli_egitimler').document(doc_id).update({
        'transcriptChunks': chunks,
        'guncellemeTarihi': firestore.SERVER_TIMESTAMP,
    })
    return True, f'{len(chunks)} chunk, {payload_size//1024}KB'

# ─── Main ───────────────────────────────────────────────────────────────
def main():
    print(f"{'='*70}", flush=True)
    print(f"  WHISPER CHUNKS BACKFILL | model={args.model} | dry-run={args.dry_run}", flush=True)
    print(f"{'='*70}\n", flush=True)

    candidates = get_candidates()
    if args.limit > 0:
        candidates = candidates[:args.limit]
        print(f"[LIMIT] Ilk {len(candidates)} video islenecek\n", flush=True)
    total = len(candidates)
    if total == 0:
        print("[DONE] Islenecek video yok. Tum aktif videolarda zaten chunks var.", flush=True)
        return

    ok, fail, skip = 0, 0, 0
    start = time.time()

    for i, v in enumerate(candidates, 1):
        elapsed = time.time() - start
        eta_sec = (elapsed / i * (total - i)) if i > 1 else 0
        eta_h = int(eta_sec // 3600); eta_m = int((eta_sec % 3600) // 60)
        print(f"[{i}/{total}] ({v['vimeo_id']}) {v['title'][:55]} | {v['sure']//60}dk | ETA {eta_h}h{eta_m}m", flush=True)

        audio_path = AUDIO_DIR / f"{v['vimeo_id']}.m4a"
        try:
            # 1. Download (zaten varsa atla)
            if audio_path.exists() and audio_path.stat().st_size > 1024:
                print(f"  [1/3] Audio zaten var ({audio_path.stat().st_size // (1024*1024)} MB)", flush=True)
            else:
                print(f"  [1/3] Indiriliyor...", flush=True)
                t0 = time.time()
                download_audio(v['vimeo_id'], v['link'])
                print(f"        Indirildi ({time.time()-t0:.0f}s, {audio_path.stat().st_size // (1024*1024)} MB)", flush=True)

            # 2. Whisper transcribe
            print(f"  [2/3] Whisper calisiyor (model={args.model})...", flush=True)
            t0 = time.time()
            chunks = transcribe_with_segments(audio_path)
            chunks = merge_short_chunks(chunks)
            print(f"        Bitti ({time.time()-t0:.0f}s, {len(chunks)} chunk)", flush=True)

            if not chunks:
                print(f"  >> UYARI: Hic segment uretilmedi (sessiz/bos video?)", flush=True)
                fail += 1
                # Audio temizle
                try: audio_path.unlink()
                except: pass
                continue

            # 3. Firestore'a yaz (DRY-RUN'da atla)
            if args.dry_run:
                print(f"  [3/3] [DRY-RUN] {len(chunks)} chunk Firestore'a YAZILMADI", flush=True)
                ok += 1
            else:
                success, info = save_to_firestore(v['id'], chunks)
                if success:
                    print(f"  [3/3] FIRESTORE OK: {info}", flush=True)
                    ok += 1
                else:
                    print(f"  [3/3] FIRESTORE SKIP: {info}", flush=True)
                    skip += 1

            # 4. Audio temizle (disk dolmasın)
            try: audio_path.unlink()
            except: pass

        except KeyboardInterrupt:
            print("\n[INTERRUPT] Kullanici durdurdu. Yeniden calistirinca kaldigi yerden devam eder.", flush=True)
            try: audio_path.unlink()
            except: pass
            break
        except Exception as e:
            fail += 1
            print(f"  >> HATA: {str(e)[:200]}", flush=True)
            try: audio_path.unlink()
            except: pass

    elapsed = int(time.time() - start)
    print(f"\n{'='*70}", flush=True)
    print(f"  SONUC", flush=True)
    print(f"  Basarili:  {ok}", flush=True)
    print(f"  Atlanan:   {skip}", flush=True)
    print(f"  Hata:      {fail}", flush=True)
    print(f"  Sure:      {elapsed//3600}h {(elapsed%3600)//60}m {elapsed%60}s", flush=True)
    print(f"{'='*70}\n", flush=True)

if __name__ == '__main__':
    main()
