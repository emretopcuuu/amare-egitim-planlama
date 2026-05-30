// Anonim + email link tabanlı kimlik yönetimi.
// Site açılışında otomatik anonim signIn (görünmez).
// Sonradan Tier 1 (email magic link) için linkWithCredential kullanılır,
// mevcut anonim verisi (favori, watch progress, vs.) kaybolmaz.
//
// Kullanım:
//   const { currentUser, uid, isAnonymous, ready } = useAuth();

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. Auth state'i dinle
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Mevcut kullanıcı var — anonim veya email
        setCurrentUser(user);
        setReady(true);
        // SSO köprüsü: gerçek (anonim olmayan, email'li) kullanıcı → .oneteamglobal.ai
        // ortak Supabase oturumu kur (HBB/90gün/CRM/Presidential otomatik girişli olsun).
        // Lazy import: supabase-js sadece gerçek giriş olunca yüklenir, anonim yolu etkilenmez.
        if (!user.isAnonymous && user.email) {
          import('../utils/ssoBridge')
            .then((m) => m.bridgeToSupabase(user))
            .catch(() => {});
        }
      } else {
        // Hiçbir kullanıcı yok → otomatik anonim signIn
        try {
          await signInAnonymously(auth);
          // signInAnonymously sonrası onAuthStateChanged tekrar tetiklenir
          // ve currentUser set edilir, burada bir şey yapmaya gerek yok
        } catch (err) {
          console.warn('[auth] anonim signIn başarısız:', err.message);
          // Yine de ready=true yap — site çalışsın
          setCurrentUser(null);
          setReady(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
    displayName: currentUser?.displayName || null,
    isAnonymous: currentUser?.isAnonymous || false,
    isAuthenticated: !!currentUser && !currentUser?.isAnonymous,
    ready,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
