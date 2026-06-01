// Firebase Storage bucket'ına CORS config ekle
// Sorun: tarayıcı Canvas'a foto çizemiyor (CORS yok) → afişte foto görünmüyor
import 'dotenv/config';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket: 'amare-egitim-planlama.firebasestorage.app',
});

const bucket = admin.storage().bucket();

const corsConfig = [
  {
    origin: ['*'],
    method: ['GET', 'HEAD'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Cache-Control'],
  },
];

console.log('Önceki CORS:');
const [oncekiMeta] = await bucket.getMetadata();
console.log(JSON.stringify(oncekiMeta.cors || [], null, 2));

await bucket.setCorsConfiguration(corsConfig);

console.log('\n✓ CORS config eklendi:');
console.log(JSON.stringify(corsConfig, null, 2));

const [yeniMeta] = await bucket.getMetadata();
console.log('\nDoğrulama (bucket\'tan okunan):');
console.log(JSON.stringify(yeniMeta.cors, null, 2));

process.exit(0);
