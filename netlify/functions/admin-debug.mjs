// netlify/functions/admin-debug.mjs
// Geçici debug endpoint — admin yetki sorunu tespiti için
// GET ?email=xxx@gmail.com → o kullanıcının Firebase Auth bilgisi + admin durumu

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const ADMIN_EMAILS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
  'ilknurakkas17@gmail.com',
  'giray70@gmail.com',
  'furkancite@gmail.com',
];

export default async (req) => {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) {
      return new Response(JSON.stringify({ error: 'email param gerekli' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    let user = null;
    let userError = null;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      userError = e.message;
    }

    const result = {
      email: email,
      adminListesinde: ADMIN_EMAILS.includes(email.toLowerCase()),
      firebaseAuth: user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        providerId: user.providerData?.[0]?.providerId,
        creationTime: user.metadata?.creationTime,
        lastSignInTime: user.metadata?.lastSignInTime,
        disabled: user.disabled,
      } : null,
      firebaseAuthError: userError,
    };

    // Firestore users/{uid} dökümanı var mı?
    if (user) {
      try {
        const doc = await admin.firestore().doc(`users/${user.uid}`).get();
        result.firestoreUserDoc = doc.exists ? { ...doc.data(), _exists: true } : { _exists: false };
      } catch (e) {
        result.firestoreUserDocError = e.message;
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
