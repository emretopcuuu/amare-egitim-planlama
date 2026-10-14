import 'dotenv/config'; import admin from 'firebase-admin';
admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\n/g,'\n')})});
const db=admin.firestore();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tokRes=await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZACC}`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(`${process.env.ZCID}:${process.env.ZSEC}`).toString('base64')}});
const token=(await tokRes.json()).access_token;
const zget=async p=>{const r=await fetch('https://api.zoom.us/v2'+p,{headers:{Authorization:'Bearer '+token}}); if(r.status===429){await sleep(1500); return zget(p);} if(!r.ok)throw new Error('HTTP '+r.status); return r.json();};
const encUUID=u=>encodeURIComponent(encodeURIComponent(u));
const parse=t=>{const p=String(t||'').split('.').map(Number); if(p.length!==3)return null; return new Date(p[2],p[1]-1,p[0]);};
const istP=iso=>new Date(new Date(iso).getTime()+3*3600*1000);
const saatDk=s=>{const [h=0,m=0]=String(s||'').split(':').map(n=>parseInt(n,10)); return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);};
const istNow=new Date(Date.now()+3*3600*1000); const bugun=new Date(istNow.getUTCFullYear(),istNow.getUTCMonth(),istNow.getUTCDate());
const snap=await db.collection('takvim').get();
const adaylar=[];
snap.forEach(d=>{const e=d.data(); const dt=parse(e.tarih); if(!dt||dt>bugun)return; if(e.zoomGercekKatilim!=null)return; const m=(e.yer||'').match(/(\d[\d\s]{6,})/); if(!m)return; adaylar.push({id:d.id,egitim:e.egitim,tarih:e.tarih,saat:e.saat,zoomId:m[1].replace(/\s/g,''),dt});});
adaylar.sort((a,b)=>b.dt-a.dt);
console.log('Geriye dönük işlenecek geçmiş Zoom eğitimi:', adaylar.length);
const instCache=new Map();
let yazildi=0, oturumYok=0, hata=0;
for(const a of adaylar){
  try{
    if(!instCache.has(a.zoomId)){ instCache.set(a.zoomId, (await zget(`/past_meetings/${a.zoomId}/instances`)).meetings||[]); await sleep(200); }
    const gun=parse(a.tarih);
    const ogun=instCache.get(a.zoomId).filter(x=>{const i=istP(x.start_time); return i.getUTCFullYear()===gun.getFullYear()&&i.getUTCMonth()===gun.getMonth()&&i.getUTCDate()===gun.getDate();});
    const hedef=saatDk(a.saat);
    const oturum=ogun.sort((x,y)=>Math.abs((istP(x.start_time).getUTCHours()*60+istP(x.start_time).getUTCMinutes())-hedef)-Math.abs((istP(y.start_time).getUTCHours()*60+istP(y.start_time).getUTCMinutes())-hedef))[0];
    if(!oturum){ oturumYok++; continue; }
    const kisiler=new Map(); let nt='';
    do{ const page=await zget(`/report/meetings/${encUUID(oturum.uuid)}/participants?page_size=300${nt?`&next_page_token=${nt}`:''}`); for(const p of page.participants||[]){const k=(p.user_email||p.name||'anon').toLowerCase().trim(); kisiler.set(k,(kisiler.get(k)||0)+(p.duration||0));} nt=page.next_page_token||''; await sleep(120); }while(nt);
    const sayi=kisiler.size, ortDk=sayi?Math.round([...kisiler.values()].reduce((s,v)=>s+v,0)/sayi/60):0;
    await db.collection('takvim').doc(a.id).set({zoomGercekKatilim:sayi,zoomOrtDakika:ortDk,zoomRaporTs:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    yazildi++;
    if(yazildi%10===0) console.log(`  ...${yazildi} yazıldı`);
  }catch(e){ hata++; if(hata<=5) console.log(`  ! ${a.tarih} ${a.egitim.slice(0,30)}: ${e.message}`); }
  await sleep(120);
}
console.log(`\nSONUÇ → yazıldı: ${yazildi} | oturum bulunamadı: ${oturumYok} | hata: ${hata}`);
process.exit(0);
