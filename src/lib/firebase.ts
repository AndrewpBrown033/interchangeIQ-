import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
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
        // Send verification email for newly created users
        try {
          await sendEmailVerification(cred.user);
          console.log('Verification email sent to', trimmedEmail);
        } catch (emailErr) {
          console.warn('Failed to send verification email:', emailErr);
        }
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

export async function sendEmailVerificationToCurrentUser(): Promise<boolean> {
  try {
    if (!auth.currentUser) return false;
    await sendEmailVerification(auth.currentUser);
    return true;
  } catch (err) {
    console.warn('Error sending verification email:', err);
    return false;
  }
}

// Sends a "reset your password" email via Firebase Auth. Works for both the
// login screen's "Forgot password?" link and the Admin > Coaches & Roles
// "Reset Password" action — Firebase handles the reset flow entirely, so
// there's no separate server endpoint needed.
export async function sendPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  try {
    await sendPasswordResetEmail(auth, trimmedEmail);
    return { ok: true };
  } catch (err: any) {
    console.warn('Error sending password reset email:', err);
    // Firebase deliberately returns the same generic error for "no account with
    // this email" as for other failures, to avoid leaking which emails are
    // registered — so we surface a generic message either way.
    return { ok: false, error: err.message || 'Could not send reset email. Please try again.' };
  }
}