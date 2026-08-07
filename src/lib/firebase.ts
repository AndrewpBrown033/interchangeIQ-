import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User, sendEmailVerification, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
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
  smtpOverride?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  };
}

// The two halves of an actual, secure password reset — used by the "Set New
// Password" screen that appears when someone clicks the real link from
// Firebase's own reset email (which arrives as ?mode=resetPassword&oobCode=...).
// This is the ONLY reset path that can safely let someone set a new password
// without knowing their old one — oobCode is a single-use, time-limited secret
// token that only exists because Firebase emailed it to the account's actual
// inbox. A plain `?resetEmail=<address>` link (used elsewhere previously) has
// no such token — anyone who saw or guessed an email address could use it, so
// it's not wired up to actually change anything.
export async function checkPasswordResetCode(oobCode: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { ok: true, email };
  } catch (err: any) {
    return { ok: false, error: err.message || 'This reset link is invalid or has expired. Please request a new one.' };
  }
}

export async function completePasswordReset(oobCode: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Could not reset password. Please request a new reset link.' };
  }
}

// Sends a "reset your password" email using Firebase Auth's own secure,
// single-use reset link — plus a courtesy notice through the Firestore mail
// extension and the custom server endpoint (SMTP/MailerSend/Resend), for
// setups where Firebase's own delivery is unreliable. Works for both the
// login screen's "Forgot password?" link and the Admin > Coaches & Roles
// "Reset Password" action.
//
// IMPORTANT: if the email you're testing has no actual Firebase Auth account
// (e.g. it only exists as a Firestore `users` profile document, never
// completed real sign-up), Firebase's "email enumeration protection" makes
// sendPasswordResetEmail resolve successfully WITHOUT sending anything or
// throwing an error — this is deliberate, to stop attackers probing which
// emails are registered. That looks identical to a real success from this
// function's point of view. If "email sent" keeps showing but nothing ever
// arrives for a specific address, check Firebase Console > Authentication >
// Users for that exact email — if it's not listed there, that's why.
export async function sendPasswordReset(
  email: string,
  options?: SendPasswordResetOptions
): Promise<{ ok: boolean; error?: string; details?: string; transport?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  // 1. Firebase Auth's own reset email — the only channel that produces a
  // link that actually works (see the "Set New Password" screen).
  let firebaseOk = false;
  let firebaseError = '';
  try {
    await sendPasswordResetEmail(auth, trimmedEmail);
    firebaseOk = true;
  } catch (err: any) {
    console.warn('Firebase sendPasswordResetEmail warning:', err);
    firebaseError = err.message || err.code || 'Firebase Auth reset error';
  }

  // 2. Courtesy notice via the Firestore 'mail' collection (only does anything
  // if the "Trigger Email from Firestore" extension is installed). Points back
  // to the real Firebase email rather than trying to be a working link itself.
  try {
    await sendEmailViaFirestoreExtension(
      trimmedEmail,
      'Password Reset Requested — InterchangeIQ',
      `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2>InterchangeIQ Password Reset Requested</h2>
        <p>Hello ${options?.name || 'Coach'},</p>
        <p>A password reset was requested for your account (<strong>${trimmedEmail}</strong>).</p>
        <p>Check your inbox for a separate email from Firebase with a secure link to set your new password.
        If you don't see it within a few minutes, check your spam folder, or request another reset from the InterchangeIQ sign-in screen.</p>
      </div>`,
      `A password reset was requested for ${trimmedEmail}. Check your inbox (and spam folder) for the secure reset link from Firebase.`
    );
  } catch (_extErr) {
    // Ignore if collection write is prevented or extension isn't active
  }

  // 3. Courtesy notice via the custom server endpoint (SMTP/MailerSend/Resend),
  // same reasoning as above.
  try {
    const res = await fetch('/api/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: trimmedEmail,
        toName: options?.name,
        smtpOverride: options?.smtpOverride,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return { ok: true, transport: firebaseOk ? 'firebase+smtp' : (data.transport || 'smtp') };
    }
    if (firebaseOk) {
      return { ok: true, transport: 'firebase', error: data.error, details: data.details };
    }
    return {
      ok: false,
      error: data.error || firebaseError || 'Failed to send password reset email.',
      details: data.details || 'Check Admin > Notification Settings to configure SMTP mail server credentials.',
    };
  } catch (err: any) {
    console.warn('Server password reset request failed:', err);
    if (firebaseOk) {
      return { ok: true, transport: 'firebase' };
    }
    return { ok: false, error: err.message || firebaseError || 'Network error sending password reset.' };
  }
}