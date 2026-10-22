import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const app = initializeApp({
  projectId: 'book-tracker-9q4lo4',
  appId: '1:957304127050:web:565703fa3eac02b5b8b0b3',
  apiKey: 'AIzaSyCjNIN298TD14Yy0tC_3j0l7_jxqT-xr08',
  authDomain: 'book-tracker-9q4lo4.firebaseapp.com',
  storageBucket: 'book-tracker-9q4lo4.firebasestorage.app',
  messagingSenderId: '957304127050',
});

/** Persistent IndexedDB cache: offline reads and queued writes survive reloads. */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
