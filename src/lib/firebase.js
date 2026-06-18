import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔥 Replace with your Firebase config from console.firebase.google.com
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
export default app;
