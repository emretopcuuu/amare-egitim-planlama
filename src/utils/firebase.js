import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
