import React, { useState } from 'react';
import { APP_VERSION } from '../constants';
import { 
  Lock, 
  User, 
  Mail, 
  XCircle, 
  CheckCircle2, 
  TrendingUp,
  ArrowRight,
  Info,
  UserPlus,
  Terminal
} from 'lucide-react';
import { auth, db, signInAnonymously, ensureFirebaseAuthSession, sendEmailVerificationToCurrentUser } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FirebaseDebugModal } from './FirebaseDebug';

interface LoginScreenProps {
  onLoginSuccess: (userName: string, email: string) => void;
  defaultUserName: string;
  isDebugEnabled?: boolean;
}

export default function LoginScreen({ onLoginSuccess, defaultUserName, isDebugEnabled = false }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration Form States
  const [regName, setRegName] = useState(defaultUserName);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verification flow states
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Email and Password Registration Handler
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedPassword = regPassword.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setErrorMessage('Please fill in all fields.');
      setIsLoading(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      // Ensure Firebase Auth session tied to user email (this will create the user if missing and send verification)
      await ensureFirebaseAuthSession(trimmedEmail, trimmedPassword);

      // 1. Check if user already exists in Firestore 'passkeys' collection
      let querySnapshot: any = null;
      try {
        const q = query(collection(db, 'passkeys'), where('email', '==', trimmedEmail));
        querySnapshot = await getDocs(q);
      } catch (_qErr) {
        // Quiet fallback to local check
      }

      if (querySnapshot && !querySnapshot.empty) {
        setErrorMessage('An account with this Email/User ID already exists.');
        setIsLoading(false);
        return;
      }

      // 2. Create registration record (non-sensitive metadata only)
      const recordId = `pass_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const record = {
        id: recordId,
        email: trimmedEmail,
        userName: trimmedName,
        registeredAt: Date.now(),
      };

      // 3. Save to Firestore gracefully
      try {
        await setDoc(doc(db, 'passkeys', record.id), record);
      } catch (_fsErr) {
        // Saved locally, Firestore optional cloud backup skipped
      }

      // 4. Save to local storage for quick offline access (do NOT store password)
      const saved = localStorage.getItem('iiq_registered_passkeys');
      const parsed = saved ? JSON.parse(saved) : [];
      const next = [...parsed.filter((k: any) => k.email.toLowerCase() !== trimmedEmail), record];
      localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
      localStorage.setItem('iiq_user_email', trimmedEmail);

      // 5. Prompt verification flow instead of immediate sign-in
      setSuccessMessage('Account created — a verification email has been sent. Please check your inbox and click the link to verify.');
      setPendingVerificationEmail(trimmedEmail);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(`Enrolling failed: ${err.message || err.toString()}`);
      setIsLoading(false);
    }
  };

  // Email and Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const enteredEmail = email.trim().toLowerCase();
    const enteredPassword = password.trim();

    if (!enteredEmail || !enteredPassword) {
      setErrorMessage('Please enter both User ID/Email and Password.');
      setIsLoading(false);
      return;
    }

    // 1. Default fallback demo credentials
    if (enteredEmail === 'coach@interchangeiq.com' && enteredPassword === 'coach123') {
      localStorage.setItem('iiq_user_email', 'coach@interchangeiq.com');
      setIsLoading(false);
      onLoginSuccess('Coach', 'coach@interchangeiq.com');
      return;
    }

    // Ensure Auth session tied to user email
    await ensureFirebaseAuthSession(enteredEmail, enteredPassword);

    // Special Admin Auto-Login & Enrollment (e.g. for andrewpbrown@me.com and andrewpbrown33@gmail.com)
    const isAdminEmail = enteredEmail === 'andrewpbrown@me.com' || enteredEmail === 'andrewpbrown33@gmail.com';
    if (isAdminEmail) {
      const nameForAdmin = 'Coach Andrew';
      const recordId = `pass_${enteredEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const record = {
        id: recordId,
        email: enteredEmail,
        userName: nameForAdmin,
        registeredAt: Date.now(),
      };
      
      // Save locally
      const saved = localStorage.getItem('iiq_registered_passkeys');
      const parsed = saved ? JSON.parse(saved) : [];
      const next = [...parsed.filter((k: any) => k.email.toLowerCase() !== enteredEmail), record];
      localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
      localStorage.setItem('iiq_user_email', enteredEmail);

      try {
        await setDoc(doc(db, 'passkeys', record.id), record);
      } catch (_fsErr) {
        // Saved locally, Firestore optional cloud backup skipped
      }

      setIsLoading(false);
      onLoginSuccess(nameForAdmin, enteredEmail);
      return;
    }

    try {
      // 2. Query Firestore 'passkeys' collection
      let querySnapshot: any = null;
      try {
        const q = query(collection(db, 'passkeys'), where('email', '==', enteredEmail));
        querySnapshot = await getDocs(q);
      } catch (_qErr) {
        // Quiet fallback to local cache check
      }

      if (querySnapshot && !querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        // For password-backed auth we rely on Firebase sign-in above; here we just assume sign-in succeeded
        localStorage.setItem('iiq_user_email', docData.email || enteredEmail);
        // If Firebase user exists, check verification state and require it for access if desired
        try {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (!auth.currentUser.emailVerified) {
              setIsLoading(false);
              setPendingVerificationEmail(enteredEmail);
              setSuccessMessage('Please verify your email before signing in. A verification email has been sent.');
              return;
            }
          }
        } catch (e) {
          // ignore reload errors
        }

        setIsLoading(false);
        onLoginSuccess(docData.userName, docData.email || enteredEmail);
        return;
      }

      // 3. Fallback check inside local storage (e.g. if offline or Firestore query failed but user is registered locally)
      const saved = localStorage.getItem('iiq_registered_passkeys');
      const parsed = saved ? JSON.parse(saved) : [];
      const found = parsed.find((k: any) => k.email.toLowerCase() === enteredEmail);
      if (found) {
        localStorage.setItem('iiq_user_email', found.email || enteredEmail);
        setIsLoading(false);
        onLoginSuccess(found.userName, found.email || enteredEmail);
        return;
      }

      setErrorMessage('No account found with this Email/User ID. Please Enroll first!');
      setIsLoading(false);
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback check inside local storage anyway in case of Firestore error/offline
      const saved = localStorage.getItem('iiq_registered_passkeys');
      const parsed = saved ? JSON.parse(saved) : [];
      const found = parsed.find((k: any) => k.email.toLowerCase() === enteredEmail);
      if (found) {
        localStorage.setItem('iiq_user_email', found.email || enteredEmail);
        setIsLoading(false);
        onLoginSuccess(found.userName, found.email || enteredEmail);
        return;
      }
      setErrorMessage(`Login failed: ${err.message || err.toString()}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative ambient blurred backing rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl shadow-gray-200/40 p-6 relative z-10 space-y-6">
        
        {/* Brand logo & header */}
        <div className="text-center space-y-2 pt-2 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-150 flex items-center justify-center text-blue-600 shadow-sm">
            <TrendingUp className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">InterchangeIQ</h2>
          <p className="text-xs text-gray-500 font-semibold">
            Match Day User ID & Password Gateway
          </p>
        </div>

        {/* Form Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setIsRegistering(false); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-black rounded-lg transition-all ${
              !isRegistering 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegistering(true); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-black rounded-lg transition-all ${
              isRegistering 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Enroll New Account
          </button>
        </div>

        {/* Error notifications */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 flex gap-2 items-start text-xs font-semibold leading-relaxed animate-in fade-in duration-150">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notifications */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl p-3 flex gap-2 items-start text-xs font-semibold leading-relaxed animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {!isRegistering ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Coach Email / User ID</span>
              </label>
              <input
                type="email"
                required
                placeholder="coach@yourclub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegistration} className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Coach Full Name</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Smith"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Coach Email (User ID)</span>
              </label>
              <input
                type="email"
                required
                placeholder="coach@yourclub.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Account Password</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              />
              <span className="text-[9px] text-gray-400 font-bold block leading-tight">
                Password must be at least 6 characters.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Creating...' : 'Register & Create Account'}</span>
            </button>

            {/* Verification prompt UI (shown after registering) */}
            {pendingVerificationEmail && (
              <div className="space-y-3 mt-2 border-t pt-3">
                <p className="text-xs text-gray-500">
                  A verification email was sent to <b>{pendingVerificationEmail}</b>. Click the link in that email, then press the button below to continue signing in.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setCheckingVerification(true);
                      setErrorMessage(null);
                      try {
                        if (auth.currentUser) {
                          await auth.currentUser.reload();
                          if (auth.currentUser.emailVerified) {
                            setPendingVerificationEmail(null);
                            setSuccessMessage('Email verified — signing you in...');
                            // Attempt to find username from local passkeys cache
                            const saved = localStorage.getItem('iiq_registered_passkeys');
                            const parsed = saved ? JSON.parse(saved) : [];
                            const found = parsed.find((k: any) => k.email.toLowerCase() === pendingVerificationEmail);
                            const displayName = found ? (found.userName || regName) : regName;
                            setTimeout(() => {
                              onLoginSuccess(displayName, pendingVerificationEmail || regEmail);
                            }, 400);
                            return;
                          } else {
                            setErrorMessage('Email not yet verified. Please click the link in the email and try again.');
                          }
                        } else {
                          setErrorMessage('No active auth session. Please sign in with your email after verification.');
                        }
                      } catch (err) {
                        console.error('Verification check error', err);
                        setErrorMessage('Could not confirm verification; try again in a moment.');
                      } finally {
                        setCheckingVerification(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl disabled:opacity-50"
                    disabled={checkingVerification}
                  >
                    {checkingVerification ? 'Checking...' : "I verified — continue"}
                  </button>

                  <button
                    onClick={async () => {
                      setIsResending(true);
                      setErrorMessage(null);
                      try {
                        const ok = await sendEmailVerificationToCurrentUser();
                        if (ok) {
                          setSuccessMessage('Verification email resent. Check your inbox.');
                        } else {
                          setErrorMessage('Could not resend verification email for this session. Try signing in and use the resend option in Settings.');
                        }
                      } catch (err) {
                        console.error('Resend error', err);
                        setErrorMessage('Failed to resend verification email.');
                      } finally {
                        setIsResending(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl disabled:opacity-50"
                    disabled={isResending}
                  >
                    {isResending ? 'Resending...' : 'Resend verification email'}
                  </button>
                </div>
              </div>
            )}

          </form>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-wider">{APP_VERSION}</span>
            {isDebugEnabled && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => setIsDebugOpen(true)}
                  type="button"
                  className="text-[9px] font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Debug System / Firebase</span>
                </button>
              </>
            )}
          </div>
          <span className="text-[9px] font-semibold">InterchangeIQ Secure Access</span>
        </div>

        {/* Firebase Diagnostics Modal */}
        <FirebaseDebugModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      </div>
    </div>
  );
}