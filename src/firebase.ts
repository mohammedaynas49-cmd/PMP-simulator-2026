import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the single Firebase App context
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the custom provisioned Database ID explicitly
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Export secure Google Authentication providers
export const auth = getAuth(app);

// Opt-in local development against the Firebase emulators (Auth + Firestore) instead of the real
// project - useful to test end-to-end (including admin-only features and Google/anonymous sign-in
// providers that may be disabled on the real project) without touching production data or
// needing real Google Cloud credentials. Only ever active in dev, and only when explicitly
// requested; never affects a production build. Start the emulators with:
//   firebase emulators:start --only firestore,auth --project seismic-stream-gcf5x
// then run `npm run dev` with VITE_USE_FIREBASE_EMULATORS=true in .env.local.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('[firebase] Connected to local Auth + Firestore emulators.');
}
