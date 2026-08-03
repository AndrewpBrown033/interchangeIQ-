import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore (utilising the custom databaseId if provided, or default database)
const dbId = 'firestoreDatabaseId' in firebaseConfig ? (firebaseConfig as any).firestoreDatabaseId : undefined;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged };
export type { User };

export async function ensureFirebaseAuthSession(email?: string, password?: string): Promise<User | null> {
  const trimmedEmail = email ? email.trim().toLowerCase() : '';
  const pwdToUse = password && password.length >= 6 
    ? password 
    : `InterchangeIQ_${trimmedEmail ? trimmedEmail.replace(/[^a-zA-Z0-9]/g, '') : 'User'}2026!`;
  
  if (trimmedEmail && trimmedEmail.includes('@')) {
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === trimmedEmail) {
      return auth.currentUser;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pwdToUse);
      return cred.user;
    } catch (_signInErr: any) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pwdToUse);
        return cred.user;
      } catch (_createErr: any) {
        console.warn('Firebase Auth email sync notice:', _createErr.code || _createErr.message);
      }
    }
  }

  if (auth.currentUser) return auth.currentUser;

  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (_aErr: any) {
    try {
      const cred = await signInWithEmailAndPassword(auth, 'guest.coach@interchangeiq.app', 'InterchangeIQ2026!');
      return cred.user;
    } catch (_gSignErr) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, 'guest.coach@interchangeiq.app', 'InterchangeIQ2026!');
        return cred.user;
      } catch (_gCreateErr) {
        return auth.currentUser;
      }
    }
  }
}

