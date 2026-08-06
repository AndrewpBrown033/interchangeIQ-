import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
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

  // IMPORTANT: only ever attempt sign-in/account-creation for a specific
  // email when an explicit, user-chosen password was passed in (i.e. this is
  // a genuine registration or login attempt). Previously this function fell
  // back to a DETERMINISTIC, GUESSABLE password
  // (`InterchangeIQ_<email-with-punctuation-stripped>2026!`) whenever no
  // password was supplied, and would silently create a brand-new Firebase
  // Auth account under that guessed password for ANY email string passed in
  // — including just from loading a cached email on app start, or opening
  // the debug screen. That meant: (a) a phantom account with a *predictable*
  // password could be created for someone else's email before they ever
  // registered, which anyone could then log into, and (b) it produced
  // confusing side effects like stray "verify your email" sends. If no real
  // password is supplied, we skip straight to the anonymous/guest fallback
  // instead of guessing.
  if (trimmedEmail && trimmedEmail.includes('@') && password && password.length >= 6) {
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === trimmedEmail) {
      return auth.currentUser;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      return cred.user;
    } catch (_signInErr: any) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
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

/**
 * Queue an email directly into Firestore's 'mail' collection.
 * Compatible with the official Firebase Extension "Trigger Email from Firestore" (firestore-send-email).
 * @see https://extensions.dev/extensions/firebase/firestore-send-email
 */
export async function sendEmailViaFirestoreExtension(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ ok: boolean; docId?: string; error?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'mail'), {
      to: [toEmail],
      message: {
        subject: subject,
        text: textContent || subject,
        html: htmlContent,
      },
      createdAt: new Date().toISOString(),
      source: 'InterchangeIQ Application',
    });
    console.log(`[Firestore Mail Extension] Queued document in 'mail/${docRef.id}' for ${toEmail}`);
    return { ok: true, docId: docRef.id };
  } catch (err: any) {
    console.warn('[Firestore Mail Extension] Queue failed:', err.message || String(err));
    return { ok: false, error: err.message || String(err) };
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

// Sends a "reset your password" email using a genuine Firebase Admin-generated
// reset link (created server-side in /api/send-password-reset), delivered via
// your configured SMTP/MailerSend/Resend transport. Works for both the login
// screen's "Forgot password?" link and the Admin > Coaches & Roles "Reset
// Password" action.
//
// NOTE: this deliberately does NOT call the client-side Firebase Auth
// sendPasswordResetEmail() any more. Two problems with that approach:
//   1. With Firebase's "Email Enumeration Protection" enabled (the default
//      for newer projects), that call resolves successfully even when no
//      account exists for the given email, so the UI would report "reset
//      email sent!" when nothing was actually sent.
//   2. The link previously emailed to the user was just this app's own root
//      URL with a ?resetEmail= query param that nothing in the app ever read
//      — clicking it always just landed back on the ordinary login screen
//      with no way to actually set a new password.
// The server now uses the Firebase Admin SDK to generate a real, working
// password-reset link (and to honestly report auth/user-not-found), which is
// what actually fixes both issues.
export async function sendPasswordReset(
  email: string,
  options?: SendPasswordResetOptions
): Promise<{ ok: boolean; error?: string; details?: string; resetLink?: string; transport?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  // Queue to Firestore 'mail' collection (Triggers 'Trigger Email from Firestore'
  // extension if installed on Firebase). Best-effort only — ignored if the
  // extension isn't installed or the write is prevented.
  const placeholderLink = `${window.location.origin}/?resetEmail=${encodeURIComponent(trimmedEmail)}`;
  try {
    await sendEmailViaFirestoreExtension(
      trimmedEmail,
      'Reset Your InterchangeIQ Password',
      `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2>InterchangeIQ Password Reset Request</h2>
        <p>Hello ${options?.name || 'Coach'},</p>
        <p>A password reset was requested for your account (<strong>${trimmedEmail}</strong>).</p>
        <p>Please use the "Forgot password?" link on the InterchangeIQ login screen to receive a working reset link.</p>
      </div>`,
      `A password reset was requested for your InterchangeIQ account (${trimmedEmail}). Use the "Forgot password?" link on the login screen to receive a working reset link.`
    );
  } catch (_extErr) {
    // Ignore if collection write is prevented or extension isn't active
  }

  // Send via the server endpoint (/api/send-password-reset), which generates
  // a real Firebase Admin reset link and delivers it via Admin SMTP / server
  // transport. This is the single source of truth for success/failure now.
  try {
    const res = await fetch('/api/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: trimmedEmail,
        toName: options?.name,
        resetLink: options?.resetLink,
        smtpOverride: options?.smtpOverride,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const fallbackLink = data.resetLink || placeholderLink;

    if (res.ok && data.success) {
      return { ok: true, transport: data.transport || 'smtp', resetLink: fallbackLink };
    }

    return {
      ok: false,
      error: data.error || 'Failed to send password reset email.',
      details: data.details || 'Check Admin > Notification Settings to configure SMTP mail server credentials.',
      resetLink: fallbackLink,
    };
  } catch (err: any) {
    console.warn('Server password reset request failed:', err);
    return {
      ok: false,
      error: err.message || 'Network error sending password reset.',
      resetLink: placeholderLink,
    };
  }
}