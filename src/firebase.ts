import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
 * The Firebase project behind readingis.cool (web config keys are public by design).
 * To run your own copy, put your project's web config here and its id in `.firebaserc`.
 */
const app = initializeApp({
  projectId: 'readingis-cool-3n1j',
  appId: '1:71307318923:web:d7668577836f931dba268e',
  apiKey: 'AIzaSyCCZqQyvfFsHb30_uVOA5ZilvKO8zkb92Q',
  authDomain: 'readingis-cool-3n1j.firebaseapp.com',
  storageBucket: 'readingis-cool-3n1j.firebasestorage.app',
  messagingSenderId: '71307318923',
});

/** Persistent IndexedDB cache: offline reads and queued writes survive reloads. */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
