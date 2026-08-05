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

export interface SendPasswordResetOptions {
  name?: string;
  resetLink?: string;
  smtpOverride?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  };
}

// Sends a "reset your password" email using Firebase Auth and/or custom SMTP/Resend
// server endpoints. Works for both the login screen's "Forgot password?" link and the
// Admin > Coaches & Roles "Reset Password" action.
export async function sendPasswordReset(
  email: string,
  options?: SendPasswordResetOptions
): Promise<{ ok: boolean; error?: string; details?: string; resetLink?: string; transport?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  // 1. Ensure a Firebase Auth session exists for this user so Firebase Auth reset can function
  try {
    await ensureFirebaseAuthSession(trimmedEmail);
  } catch (_e) {
    // Proceed even if sync fails
  }

  // 2. Try Firebase Auth client sendPasswordResetEmail
  let firebaseOk = false;
  let firebaseError = '';
  try {
    await sendPasswordResetEmail(auth, trimmedEmail);
    firebaseOk = true;
  } catch (err: any) {
    console.warn('Firebase sendPasswordResetEmail warning:', err);
    firebaseError = err.message || err.code || 'Firebase Auth reset error';
  }

  // 3. Send via custom server endpoint (/api/send-password-reset) using Admin SMTP / server transport
  try {
    const res = await fetch('/api/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: trimmedEmail,
        toName: options?.name,
        resetLink: options?.resetLink || `${window.location.origin}/?resetEmail=${encodeURIComponent(trimmedEmail)}`,
        smtpOverride: options?.smtpOverride,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const fallbackLink = data.resetLink || `${window.location.origin}/?resetEmail=${encodeURIComponent(trimmedEmail)}`;

    if (res.ok && data.success) {
      return { ok: true, transport: data.transport || 'smtp', resetLink: fallbackLink };
    }

    if (firebaseOk) {
      return {
        ok: true,
        transport: 'firebase',
        resetLink: fallbackLink,
        error: data.error,
        details: data.details,
      };
    }

    return {
      ok: false,
      error: data.error || firebaseError || 'Failed to send password reset email.',
      details: data.details || 'Check Admin > Notification Settings to configure SMTP mail server credentials.',
      resetLink: fallbackLink,
    };
  } catch (err: any) {
    console.warn('Server password reset request failed:', err);
    const fallbackLink = `${window.location.origin}/?resetEmail=${encodeURIComponent(trimmedEmail)}`;
    if (firebaseOk) {
      return { ok: true, transport: 'firebase', resetLink: fallbackLink };
    }
    return {
      ok: false,
      error: err.message || firebaseError || 'Network error sending password reset.',
      resetLink: fallbackLink,
    };
  }
}