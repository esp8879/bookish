import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
 * Two deployments of the same app, each with its own Firebase project (web config keys are public by design):
 * - private: the owner's own library (`npm run deploy`)
 * - public: readingis.cool, open to anyone (`npm run deploy:public`, which builds with `--mode public`)
 * To run your own copy, put your project's web config in the second (private) branch.
 */
// MODE is replaced at build time, so each build keeps only its own config.
const app = initializeApp(import.meta.env.MODE === 'public'
  ? {
    projectId: 'readingis-cool-3n1j',
    appId: '1:71307318923:web:d7668577836f931dba268e',
    apiKey: 'AIzaSyCCZqQyvfFsHb30_uVOA5ZilvKO8zkb92Q',
    authDomain: 'readingis-cool-3n1j.firebaseapp.com',
    storageBucket: 'readingis-cool-3n1j.firebasestorage.app',
    messagingSenderId: '71307318923',
  }
  : {
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
