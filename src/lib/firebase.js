import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDsR7dNznDJHM-PuiCNX-xPSaWQdZ9QGew",
  authDomain: "nourishmind-49c9d.firebaseapp.com",
  projectId: "nourishmind-49c9d",
  storageBucket: "nourishmind-49c9d.firebasestorage.app",
  messagingSenderId: "489725095781",
  appId: "1:489725095781:web:87a911174dfb2603a47b8c",
  measurementId: "G-XR4S4292F7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (IndexedDB cache)
// Speeds up repeat visits — data loads from cache instantly, Firebase syncs in background
enableIndexedDbPersistence(db).catch((err) => {
  // 'failed-precondition' = multiple tabs open (fine, just skip)
  // 'unimplemented' = browser doesn't support it (fine, falls back to normal)
  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    console.warn('Firestore persistence error:', err.code);
  }
});

export default app;
