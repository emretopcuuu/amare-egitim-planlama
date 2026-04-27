import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBEtQlumVPsS8paJ4rUnsSid_P6WW-1qUY",
    authDomain: "amare-egitim-planlama.firebaseapp.com",
    projectId: "amare-egitim-planlama",
    storageBucket: "amare-egitim-planlama.firebasestorage.app",
    messagingSenderId: "473830927218",
    appId: "1:473830927218:web:6e75bd232bf0be28994beb",
    measurementId: "G-9EMBZ0WKRD"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
