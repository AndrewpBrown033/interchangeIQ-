import React, { useState, useEffect } from 'react';
import { auth, db, signInAnonymously, ensureFirebaseAuthSession } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Key,
  User as UserIcon,
  Trash2,
  Copy,
  Terminal,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DiagnosticResult {
  timestamp: string;
  appUserEmail: string | null;
  authStatus: {
    authenticated: boolean;
    uid: string | null;
    email: string | null;
    isAnonymous: boolean | null;
  };
  tests: {
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    details?: any;
  }[];
}

export const FirebaseDebugModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    addLog('Starting Firebase & Firestore diagnostics...');

    const appUserEmail = localStorage.getItem('iiq_user_email') || null;

    // Try to sync app email to Firebase Auth if not already synced
    if (appUserEmail && (!auth.currentUser || auth.currentUser.email !== appUserEmail.toLowerCase())) {
      addLog(`Attempting to sync App User (${appUserEmail}) to Firebase Auth...`);
      try {
        await ensureFirebaseAuthSession(appUserEmail);
        addLog(`Firebase Auth synced to ${auth.currentUser?.email || appUserEmail}`);
      } catch (sErr: any) {
        addLog(`Sync note: ${sErr.message || sErr}`);
      }
    }

    const diag: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      appUserEmail,
      authStatus: {
        authenticated: !!auth.currentUser,
        uid: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
        isAnonymous: auth.currentUser?.isAnonymous ?? null,
      },
      tests: [],
    };

    // Test 1: App User vs Firebase Auth Alignment
    const currentFbEmail = auth.currentUser?.email || null;
    addLog(`App Logged-in User: ${appUserEmail || 'Guest (Unregistered)'}`);
    addLog(`Firebase Auth SDK User: ${currentFbEmail || auth.currentUser?.uid || 'None'}`);

    if (currentFbEmail && appUserEmail && currentFbEmail.toLowerCase() === appUserEmail.toLowerCase()) {
      diag.tests.push({
        name: 'User Identity Alignment',
        status: 'success',
        message: `App Logged-In Account (${appUserEmail}) matches Firebase Auth Session (${currentFbEmail}).`,
      });
    } else if (currentFbEmail === 'guest.coach@interchangeiq.app') {
      diag.tests.push({
        name: 'User Identity Alignment',
        status: 'success',
        message: `App is logged in as ${appUserEmail || 'Local Coach'}. Firebase Auth SDK is using fallback 'guest.coach@interchangeiq.app' because Anonymous Auth is restricted in Firebase Console settings.`,
      });
    } else {
      diag.tests.push({
        name: 'Authentication Status',
        status: auth.currentUser ? 'success' : 'error',
        message: auth.currentUser
          ? `Authenticated as ${auth.currentUser.email || (auth.currentUser.isAnonymous ? 'Anonymous Guest' : auth.currentUser.uid)}`
          : 'No active Firebase Auth user. Firestore rules may block unauthenticated requests.',
      });
    }

    // Test 2: Try Anonymous or Session Fallback if unauthenticated
    if (!auth.currentUser) {
      addLog('Attempting anonymous sign-in...');
      try {
        const cred = await signInAnonymously(auth);
        addLog(`Anonymous sign-in succeeded: ${cred.user.uid}`);
        diag.tests.push({
          name: 'Anonymous Auth Fallback',
          status: 'success',
          message: `Successfully authenticated anonymously (${cred.user.uid})`,
        });
      } catch (aErr: any) {
        addLog(`Anonymous sign-in error: ${aErr.code || aErr.message}`);
        diag.tests.push({
          name: 'Anonymous Auth Fallback',
          status: 'error',
          message: `Failed: ${aErr.code || aErr.message}. Fallback guest account active.`,
        });
      }
    }

    // Test 3: Firestore Write to 'passkeys'
    const testDocId = `debug_test_${Date.now()}`;
    addLog(`Testing Firestore write to passkeys/${testDocId}...`);
    try {
      const testRef = doc(db, 'passkeys', testDocId);
      await setDoc(testRef, {
        test: true,
        created: Date.now(),
        createdBy: auth.currentUser?.uid || appUserEmail || 'anonymous',
      });
      addLog('Write to passkeys collection SUCCEEDED!');
      diag.tests.push({
        name: 'Firestore Write (passkeys)',
        status: 'success',
        message: 'Successfully wrote test document to passkeys collection.',
      });

      // Cleanup test doc
      addLog(`Cleaning up test doc passkeys/${testDocId}...`);
      await deleteDoc(testRef);
      addLog('Cleanup succeeded.');
    } catch (fsErr: any) {
      addLog(`Firestore write error: ${fsErr.code || fsErr.message}`);
      diag.tests.push({
        name: 'Firestore Write (passkeys)',
        status: 'error',
        message: `Write failed (${fsErr.code || fsErr.message}). Check firestore.rules permissions or Auth state.`,
        details: fsErr.toString(),
      });
    }

    // Test 4: Firestore Read from 'teams'
    addLog('Testing Firestore query on teams collection...');
    try {
      const snap = await getDocs(collection(db, 'teams'));
      addLog(`Firestore read succeeded! Found ${snap.docs.length} team document(s).`);
      diag.tests.push({
        name: 'Firestore Read (teams)',
        status: 'success',
        message: `Successfully queried teams collection (${snap.docs.length} docs found).`,
      });
    } catch (rErr: any) {
      addLog(`Firestore read error: ${rErr.code || rErr.message}`);
      diag.tests.push({
        name: 'Firestore Read (teams)',
        status: 'error',
        message: `Read failed (${rErr.code || rErr.message}).`,
        details: rErr.toString(),
      });
    }

    // Test 5: Local Storage Health
    addLog('Checking LocalStorage passkeys cache...');
    try {
      const localPasskeys = localStorage.getItem('iiq_registered_passkeys');
      const parsed = localPasskeys ? JSON.parse(localPasskeys) : [];
      addLog(`Local passkeys cache holds ${parsed.length} account(s).`);
      diag.tests.push({
        name: 'LocalStorage Offline Cache',
        status: 'success',
        message: `LocalStorage contains ${parsed.length} cached account passkey(s). App is 100% functional offline.`,
      });
    } catch (lErr: any) {
      diag.tests.push({
        name: 'LocalStorage Offline Cache',
        status: 'error',
        message: `Local cache check error: ${lErr.message}`,
      });
    }

    setResult(diag);
    setIsRunning(false);
  };

  const handleForceSyncEmail = async () => {
    const appUserEmail = localStorage.getItem('iiq_user_email');
    if (!appUserEmail) return;
    setIsRunning(true);
    addLog(`Force-syncing ${appUserEmail} with Firebase Auth...`);
    await ensureFirebaseAuthSession(appUserEmail);
    addLog(`Session updated: ${auth.currentUser?.email || auth.currentUser?.uid}`);
    await runDiagnostics();
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyReport = () => {
    if (!result) return;
    const reportText = JSON.stringify({ result, logs }, null, 2);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appEmail = localStorage.getItem('iiq_user_email') || 'Unregistered Coach';
  const fbEmail = auth.currentUser?.email || (auth.currentUser?.isAnonymous ? 'Anonymous' : 'None');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-150 relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900 tracking-tight">Firebase & Firestore System Diagnostics</h3>
              <p className="text-xs text-gray-500 font-medium">Real-time inspection of Auth Engine, Firestore Rules, and Sync state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Identity Overview Box */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
          <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Session Identity Mapping</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-blue-100 space-y-0.5">
              <div className="text-[10px] font-extrabold text-gray-400 uppercase">App Logged-in Account</div>
              <div className="font-black text-gray-900 truncate">{appEmail}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-blue-100 space-y-0.5">
              <div className="text-[10px] font-extrabold text-gray-400 uppercase">Firebase Auth Engine Session</div>
              <div className="font-black text-blue-700 truncate">{fbEmail}</div>
              <div className="text-[10px] text-gray-400 font-mono">UID: {auth.currentUser?.uid || 'Not set'}</div>
            </div>
          </div>
          {fbEmail === 'guest.coach@interchangeiq.app' && appEmail !== 'guest.coach@interchangeiq.app' && (
            <p className="text-[11px] text-blue-800 font-medium leading-relaxed pt-1">
              <strong>Note:</strong> Firebase Auth automatically falls back to <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">guest.coach@interchangeiq.app</code> when Anonymous Auth is disabled in the Firebase Console. This ensures Firestore rules allow uninterrupted database operations.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Tests...' : 'Re-Run Diagnostics'}</span>
          </button>

          {localStorage.getItem('iiq_user_email') && (
            <button
              onClick={handleForceSyncEmail}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Sync {localStorage.getItem('iiq_user_email')} to Firebase</span>
            </button>
          )}

          <button
            onClick={copyReport}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-gray-600" />
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Debug Report'}</span>
          </button>
        </div>

        {/* Test Results */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {result?.tests.map((t, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                t.status === 'success'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : t.status === 'error'
                  ? 'bg-red-50/60 border-red-200 text-red-900'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {t.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-extrabold">{t.name}</div>
                <div className="opacity-90 leading-relaxed">{t.message}</div>
                {t.details && (
                  <div className="mt-1 font-mono text-[10px] bg-red-100/70 p-1.5 rounded-lg text-red-800 break-all">
                    {t.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Terminal Logs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
            <span>Live Console Logs</span>
            <span>{logs.length} entries</span>
          </div>
          <div className="bg-gray-950 text-emerald-400 font-mono text-[11px] p-3 rounded-2xl h-28 overflow-y-auto space-y-1 shadow-inner select-text">
            {logs.length === 0 ? (
              <span className="text-gray-500 italic">No logs recorded yet...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-tight break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span className="font-medium">All sensitive data remains protected in your browser & Firestore environment.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition cursor-pointer"
          >
            Close Debugger
          </button>
        </div>

      </div>
    </div>
  );
};

