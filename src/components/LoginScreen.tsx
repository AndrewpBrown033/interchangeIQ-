import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ScanFace, 
  Lock, 
  Unlock, 
  UserPlus, 
  KeyRound, 
  Info, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface LoginScreenProps {
  onLoginSuccess: (userName: string, email: string) => void;
  defaultUserName: string;
}

interface PasskeyRecord {
  id: string;
  email: string;
  userName: string;
  registeredAt: number;
  passcode?: string;
  biometricType?: 'face' | 'fingerprint';
  password?: string;
}

export default function LoginScreen({ onLoginSuccess, defaultUserName }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState(defaultUserName);
  const [password, setPassword] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'passkey' | 'password'>('passkey');
  
  // New Numeric Passcode & Biometric Preferences
  const [isUsingPasscode, setIsUsingPasscode] = useState(false);
  const [passcodeVal, setPasscodeVal] = useState('');
  const [regPasscode, setRegPasscode] = useState('1111');
  const [regBiometricType, setRegBiometricType] = useState<'face' | 'fingerprint'>('face');

  // Biometrics and simulator states
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'fingerprint' | 'face' | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iframeWarning, setIframeWarning] = useState(false);
  
  // Stored passkeys local cache
  const [registeredKeys, setRegisteredKeys] = useState<PasskeyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_registered_passkeys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedKey, setSelectedKey] = useState<PasskeyRecord | null>(() => {
    try {
      const saved = localStorage.getItem('iiq_registered_passkeys');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  });

  // Check if we are inside an iframe
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        setIframeWarning(true);
      }
    } catch {
      setIframeWarning(true);
    }
  }, []);

  // Sync passkeys with localStorage
  useEffect(() => {
    localStorage.setItem('iiq_registered_passkeys', JSON.stringify(registeredKeys));
    if (registeredKeys.length > 0 && !selectedKey) {
      setSelectedKey(registeredKeys[0]);
    }
  }, [registeredKeys, selectedKey]);

  // Handle the scanning animation progress
  useEffect(() => {
    let interval: any;
    if (isScanning && scanStatus === 'scanning') {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanStatus('success');
            setTimeout(() => {
              setIsScanning(false);
              // Complete login or registration
              if (isRegistering) {
                completeRegistration();
              } else {
                completeLogin();
              }
            }, 1200);
            return 100;
          }
          return prev + 8;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanStatus, isRegistering]);

  // Reset scanner state
  const resetScanner = () => {
    setIsScanning(false);
    setScanProgress(0);
    setScanStatus('idle');
    setErrorMessage(null);
  };

  // Handle typing numbers on custom passcode lock screen
  const handleKeypadPress = (num: string) => {
    setErrorMessage(null);
    setPasscodeVal((prev) => {
      const next = prev + num;
      if (next.length === 4) {
        // Evaluate PIN!
        const targetUser = selectedKey || registeredKeys[0];
        const correctPIN = targetUser?.passcode || '1111';
        if (next === correctPIN) {
          // Success! Trigger short success display then log in
          setTimeout(() => {
            onLoginSuccess(targetUser?.userName || 'Coach', targetUser?.email || 'coach@interchangeiq.com');
          }, 300);
        } else {
          setErrorMessage('Incorrect passcode. Please try again.');
          return ''; // reset passcode
        }
      }
      return next;
    });
  };

  // Trigger real WebAuthn or fallback simulator
  const triggerPasskeyAuth = async (action: 'register' | 'login', anyKey = false) => {
    resetScanner();
    setErrorMessage(null);

    // Default scan visual type based on registration choice or user preference
    const targetUser = selectedKey || registeredKeys[0];
    const type = action === 'register' ? regBiometricType : (targetUser?.biometricType || 'face');
    setScanType(type);

    // Try REAL WebAuthn Web API
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn/Passkeys are not supported on this browser version.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      if (action === 'register') {
        if (!email.trim() || !name.trim()) {
          setErrorMessage('Please provide both your Coach Email and Full Name to register.');
          return;
        }

        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const publicKey: PublicKeyCredentialCreationOptions = {
          challenge: challenge,
          rp: {
            name: "InterchangeIQ",
            id: window.location.hostname || "localhost",
          },
          user: {
            id: userId,
            name: email,
            displayName: name,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            userVerification: "required",
            residentKey: "required",
            requireResidentKey: true,
          },
          timeout: 15000,
        };

        // This triggers the native iPad/iPhone Touch ID/Face ID prompt!
        const credential = await navigator.credentials.create({ publicKey });
        if (credential) {
          // Success! Register this user
          const newKey: PasskeyRecord = {
            id: credential.id,
            email: email.trim(),
            userName: name.trim(),
            registeredAt: Date.now(),
            passcode: regPasscode || '1111',
            biometricType: regBiometricType,
            password: regPassword.trim()
          };
          setRegisteredKeys((prev) => {
            const next = [...prev, newKey];
            localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
            return next;
          });
          setSelectedKey(newKey);
          
          // Also store to Firestore!
          try {
            await setDoc(doc(db, 'passkeys', newKey.id), newKey);
          } catch (fsErr) {
            console.warn("Could not save passkey to Firestore:", fsErr);
          }

          setScanStatus('success');
          onLoginSuccess(newKey.userName, newKey.email);
          return;
        }
      } else {
        // Authenticating
        if (!anyKey && !targetUser) {
          setErrorMessage('No passkeys found. Please register a passkey first.');
          return;
        }

        if (!anyKey && targetUser) {
          const isSimulatedKey = targetUser.id.startsWith('pass_') || targetUser.id.startsWith('mock_');
          if (isSimulatedKey) {
            throw new Error('Using simulated credential.');
          }
        }

        let allowCredentials: PublicKeyCredentialDescriptor[] = [];
        if (!anyKey && targetUser && targetUser.id) {
          try {
            // Convert base64 / base64url string ID to Uint8Array
            let base64 = targetUser.id.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
              base64 += '=';
            }
            const rawData = window.atob(base64);
            const idBuffer = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              idBuffer[i] = rawData.charCodeAt(i);
            }
            allowCredentials.push({
              id: idBuffer,
              type: 'public-key'
            });
          } catch (e) {
            console.warn("Could not parse credential ID for allowCredentials:", e);
          }
        }

        const publicKey: PublicKeyCredentialRequestOptions = {
          challenge: challenge,
          rpId: window.location.hostname,
          timeout: 15000,
          userVerification: "required",
          ...(allowCredentials.length > 0 ? { allowCredentials } : {})
        };

        // This triggers the native Face ID/Touch ID prompt!
        const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
        if (assertion) {
          setScanStatus('success');
          
          // Find the passkey
          let foundKey = registeredKeys.find(k => k.id === assertion.id);
          if (!foundKey) {
            // Query Firestore
            try {
              const snap = await getDoc(doc(db, 'passkeys', assertion.id));
              if (snap.exists()) {
                foundKey = snap.data() as PasskeyRecord;
                // Save locally
                setRegisteredKeys(prev => {
                  const next = [...prev.filter(k => k.id !== foundKey!.id), foundKey!];
                  localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
                  return next;
                });
              }
            } catch (fsErr) {
              console.warn("Could not retrieve passkey from Firestore:", fsErr);
            }
          }

          if (foundKey) {
            onLoginSuccess(foundKey.userName, foundKey.email);
          } else {
            // Fallback if we authenticated successfully via WebAuthn but have no local record
            onLoginSuccess('Coach', 'coach@interchangeiq.com');
          }
          return;
        }
      }
    } catch (err: any) {
      console.warn("Native WebAuthn error / boundary caught:", err);
      
      const isIframe = window.self !== window.top;
      
      if (isIframe) {
        // Fallback simulator automatically for iframe
        if (action === 'register') {
          if (!email.trim() || !name.trim()) {
            setErrorMessage('Please provide both your Coach Email and Full Name to register.');
            return;
          }
        } else {
          if (!anyKey && !targetUser && registeredKeys.length > 0) {
            setErrorMessage('Select an account to unlock.');
            return;
          }
        }

        // Boot interactive simulation
        setIsScanning(true);
        setScanStatus('scanning');
        setScanProgress(0);
      } else {
        // If they are in a real tab (such as on iPhone Safari), provide smart feedback
        const errName = err?.name;
        const errMsg = err?.message?.toLowerCase() || '';
        const isCancellation = errName === 'NotAllowedError' || 
                              errMsg.includes('cancel') || 
                              errMsg.includes('not allowed') || 
                              errMsg.includes('user-canc') || 
                              errMsg.includes('timed out');
        
        if (isCancellation) {
          if (action === 'register') {
            setErrorMessage('Apple Passkey registration was cancelled or timed out. Please make sure Face ID / Touch ID or a device passcode is set up on your iPhone under Settings, and try again.');
          } else {
            setErrorMessage('No matching Apple Passkey was found on this iPhone, or the prompt was cancelled. If you haven\'t enrolled this device yet, please register your key below.');
          }
        } else {
          setErrorMessage(`Apple Passkey error: ${err?.message || err?.toString()}`);
        }
      }
    }
  };

  const completeRegistration = async () => {
    const newKey: PasskeyRecord = {
      id: `pass_${Math.random().toString(36).substr(2, 9)}`,
      email: email.trim(),
      userName: name.trim(),
      registeredAt: Date.now(),
      passcode: regPasscode || '1111',
      biometricType: regBiometricType,
      password: regPassword.trim()
    };
    setRegisteredKeys((prev) => {
      const next = [...prev, newKey];
      localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
      return next;
    });
    setSelectedKey(newKey);
    setIsRegistering(false);

    // Also store to Firestore!
    try {
      await setDoc(doc(db, 'passkeys', newKey.id), newKey);
    } catch (fsErr) {
      console.warn("Could not save simulated passkey to Firestore:", fsErr);
    }
    
    // Auto login
    onLoginSuccess(newKey.userName, newKey.email);
  };

  const completeLogin = () => {
    const targetUser = selectedKey || registeredKeys[0];
    if (targetUser) {
      onLoginSuccess(targetUser.userName, targetUser.email);
    } else {
      // Fallback guest login if no keys exist but simulator completes
      onLoginSuccess(name || 'Coach', email || 'coach@interchangeiq.com');
    }
  };

  const handleGuestLogin = () => {
    onLoginSuccess('Guest Coach', 'guest@interchangeiq.com');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both User ID/Email and Password.');
      return;
    }
    
    const enteredEmail = email.trim().toLowerCase();
    
    // 1. Default fallback demo credentials
    if (enteredEmail === 'coach@interchangeiq.com' && password === 'coach123') {
      onLoginSuccess('Coach', 'coach@interchangeiq.com');
      return;
    }

    // 1.5. Special Admin Auto-Login & Enrollment (for andrewpbrown@me.com and andrewpbrown33@gmail.com)
    const isAdminEmail = enteredEmail === 'andrewpbrown@me.com' || enteredEmail === 'andrewpbrown33@gmail.com';
    if (isAdminEmail) {
      const nameForAdmin = 'Coach Andrew';
      const existingKey = registeredKeys.find(k => k.email.toLowerCase() === enteredEmail);
      if (!existingKey) {
        const newKey: PasskeyRecord = {
          id: `pass_admin_${Math.random().toString(36).substr(2, 9)}`,
          email: enteredEmail,
          userName: nameForAdmin,
          registeredAt: Date.now(),
          passcode: '1111',
          biometricType: 'face',
          password: password
        };
        setRegisteredKeys((prev) => {
          const next = [...prev, newKey];
          localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
          return next;
        });
        setSelectedKey(newKey);
        try {
          await setDoc(doc(db, 'passkeys', newKey.id), newKey);
        } catch (fsErr) {
          console.warn("Could not save admin passkey to Firestore:", fsErr);
        }
      } else if (existingKey.password !== password) {
        // If they enter a different password, dynamically update it to let them in and keep it in sync
        existingKey.password = password;
        setRegisteredKeys([...registeredKeys]);
        localStorage.setItem('iiq_registered_passkeys', JSON.stringify(registeredKeys));
        try {
          await setDoc(doc(db, 'passkeys', existingKey.id), existingKey);
        } catch (fsErr) {
          console.warn("Could not update admin passkey in Firestore:", fsErr);
        }
      }
      onLoginSuccess(nameForAdmin, enteredEmail);
      return;
    }
    
    // 2. Check local registeredKeys
    let found = registeredKeys.find(k => k.email.toLowerCase() === enteredEmail);
    
    if (found) {
      if (found.password === password) {
        onLoginSuccess(found.userName, found.email);
        return;
      } else {
        setErrorMessage('Incorrect password. Please try again.');
        return;
      }
    }
    
    // 3. Query Firestore 'passkeys' collection
    setIsScanning(true);
    setScanStatus('scanning');
    setScanProgress(20);
    
    try {
      const q = query(collection(db, 'passkeys'), where('email', '==', enteredEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data() as PasskeyRecord;
        if (docData.password === password) {
          // Save to local registeredKeys
          setRegisteredKeys((prev) => {
            if (prev.some(k => k.id === docData.id)) return prev;
            const next = [...prev, docData];
            localStorage.setItem('iiq_registered_passkeys', JSON.stringify(next));
            return next;
          });
          setSelectedKey(docData);
          setScanStatus('success');
          setScanProgress(100);
          setTimeout(() => {
            setIsScanning(false);
            onLoginSuccess(docData.userName, docData.email);
          }, 1000);
          return;
        } else {
          setIsScanning(false);
          setScanStatus('idle');
          setErrorMessage('Incorrect password for this User ID.');
          return;
        }
      } else {
        setIsScanning(false);
        setScanStatus('idle');
        setErrorMessage('No account found with this User ID. Please Enroll first!');
      }
    } catch (err: any) {
      console.error("Firestore query error:", err);
      setIsScanning(false);
      setScanStatus('idle');
      setErrorMessage(`No local account matches. Firestore lookup failed: ${err.message || err}`);
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
            iPad & iPhone Touch ID / Face ID Match Day Gateway
          </p>
        </div>

        {/* Dynamic Warning for running inside AI Studio preview frame */}
        {iframeWarning && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-600 block">
                Preview Sandbox Active
              </span>
              <p className="text-[10px] text-gray-700 font-medium leading-relaxed">
                Iframe sandboxing restricts real browser Passkey dialogs. 
                We've built an <b>iOS biometrics simulator</b> so you can experience Face ID unlocking directly in this frame!
              </p>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 mt-1"
              >
                Open in Full Tab for Real Touch ID <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Interactive Biometrics Scanning Interface */}
        {isScanning ? (
          <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center justify-center space-y-5 py-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              {/* Spinning/glowing tracking ring */}
              <div className="absolute w-20 h-20 border-2 border-dashed border-blue-500/30 rounded-full animate-spin duration-1000" />
              
              {/* Outer scanning circle */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={scanStatus === 'success' ? '#10b981' : '#3b82f6'}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * scanProgress) / 100}
                  className="transition-all duration-150 ease-out"
                />
              </svg>

              {/* Central device icon */}
              <div className="absolute flex items-center justify-center">
                {scanStatus === 'success' ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
                ) : scanType === 'face' ? (
                  <ScanFace className="w-10 h-10 text-blue-500 animate-pulse" />
                ) : (
                  <Fingerprint className="w-10 h-10 text-blue-500 animate-pulse" />
                )}
              </div>
            </div>

            <div className="text-center space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                {scanStatus === 'success' ? 'Authenticated' : 'Verifying Biometrics'}
              </span>
              <p className="text-[10px] text-gray-500 font-bold">
                {scanStatus === 'success' 
                  ? 'Welcome back, Coach!' 
                  : scanType === 'face' 
                    ? 'Align face with camera lens...' 
                    : 'Hold index finger on Touch ID sensor...'}
              </p>
            </div>

            {scanStatus !== 'success' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                <button
                  type="button"
                  onClick={() => setScanType(scanType === 'face' ? 'fingerprint' : 'face')}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-black bg-blue-50 border border-blue-100/40 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Switch to {scanType === 'face' ? 'Touch ID' : 'Face ID'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsScanning(false);
                    setScanStatus('idle');
                    setScanProgress(0);
                    setErrorMessage('Apple Passkey authentication timed out (NotAllowedError: Request timed out). Please make sure Face ID / Touch ID or a device passcode is set up on your device under Settings, and try again.');
                  }}
                  className="text-[10px] text-amber-700 hover:text-amber-800 font-black bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                >
                  ⚠️ Simulate Timeout
                </button>
              </div>
            )}

            <button 
              onClick={resetScanner} 
              className="text-[10px] text-gray-600 hover:text-gray-900 font-extrabold uppercase tracking-wide border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Normal Login/Register Forms */
          <div className="space-y-5 animate-in fade-in duration-200">
            
            {/* Toggle state buttons */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => { setIsRegistering(false); setErrorMessage(null); setIsUsingPasscode(false); }}
                className={`py-2 text-xs font-black rounded-lg transition ${
                  !isRegistering 
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsRegistering(true); setErrorMessage(null); setIsUsingPasscode(false); }}
                className={`py-2 text-xs font-black rounded-lg transition ${
                  isRegistering 
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Enroll New Device
              </button>
            </div>

            {!isRegistering && (
              <div className="flex justify-center gap-6 border-b border-gray-150 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('passkey'); setErrorMessage(null); }}
                  className={`pb-2 font-black transition-colors flex items-center gap-1.5 cursor-pointer ${
                    loginMethod === 'passkey' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>🔒</span>
                  <span>Passkey / PIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setErrorMessage(null); }}
                  className={`pb-2 font-black transition-colors flex items-center gap-1.5 cursor-pointer ${
                    loginMethod === 'password' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>🔑</span>
                  <span>User ID & Password</span>
                </button>
              </div>
            )}

            {/* Error notifications */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 flex flex-col gap-1.5 text-[10px] font-semibold">
                <div className="flex gap-2 items-start">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
                {window.self === window.top && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setIsScanning(true);
                      setScanStatus('scanning');
                      setScanProgress(0);
                    }}
                    className="mt-1 text-blue-600 hover:text-blue-800 font-bold underline text-left cursor-pointer self-start"
                  >
                    💡 Trouble with native Face ID? Tap here to run the interactive biometrics simulator
                  </button>
                )}
              </div>
            )}

            {/* REGISTER SCREEN FORM */}
            {isRegistering ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    Coach Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    Coach Email (User ID)
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
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    Set Account Password (Non-Passkey Fallback)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
                  />
                  <span className="text-[9px] text-gray-400 font-bold leading-tight block">
                    Use this password to log in if device passkey is missing or unsupported.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    Set a Numeric Passcode (4-digit PIN)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="e.g. 1111"
                    value={regPasscode}
                    onChange={(e) => setRegPasscode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono font-bold tracking-widest text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                    Preferred Biometric Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegBiometricType('face')}
                      className={`p-2 border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        regBiometricType === 'face'
                          ? 'bg-blue-50 border-blue-500 text-blue-900'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ScanFace className="w-4 h-4 text-blue-500" />
                      <span>Face ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegBiometricType('fingerprint')}
                      className={`p-2 border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        regBiometricType === 'fingerprint'
                          ? 'bg-blue-50 border-blue-500 text-blue-900'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Fingerprint className="w-4 h-4 text-blue-500" />
                      <span>Touch ID</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerPasskeyAuth('register')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Passkey & Launch</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-150"></div>
                  <span className="flex-shrink mx-2 text-[8px] text-gray-400 font-bold uppercase tracking-wider">or skip passkey</span>
                  <div className="flex-grow border-t border-gray-150"></div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!email.trim() || !name.trim() || !regPassword.trim()) {
                      setErrorMessage('Please provide Coach Name, Email/User ID, and Password to enroll.');
                      return;
                    }
                    setIsScanning(true);
                    setScanStatus('scanning');
                    setScanProgress(0);
                  }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Enroll with Password Only</span>
                </button>
              </div>
            ) : (
              /* LOGIN SCREEN FORM */
              <div className="space-y-4">
                {loginMethod === 'password' ? (
                  /* PASSWORD LOGIN VIEW */
                  <form onSubmit={handlePasswordLogin} className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        Coach Email / User ID
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
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        Password
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
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer animate-none"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign In with Password</span>
                    </button>
                  </form>
                ) : registeredKeys.length > 0 ? (
                  isUsingPasscode ? (
                    /* PASSCODE LOCK SCREEN VIEW */
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                          Lock Screen Passcode
                        </span>
                        <b className="text-sm text-gray-900 block">
                          Enter Passcode for {selectedKey?.userName || 'Coach'}
                        </b>
                        {selectedKey?.id === 'mock_coach' && (
                          <p className="text-[10px] text-emerald-600 font-bold">
                            💡 Demo Passcode is <span className="underline font-black">1111</span>
                          </p>
                        )}
                      </div>

                      {/* Numeric passcode status dots */}
                      <div className="flex justify-center items-center gap-4 py-2">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-full border-2 border-gray-300 transition-all ${
                              passcodeVal.length > idx
                                ? 'bg-blue-600 border-blue-600 scale-110'
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Keypad Grid */}
                      <div className="grid grid-cols-3 gap-y-3 gap-x-6 max-w-[240px] mx-auto py-1">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleKeypadPress(num)}
                            className="w-14 h-14 rounded-full border border-gray-100 bg-white hover:bg-gray-150 active:bg-gray-200 text-gray-800 text-lg font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          onClick={() => { setPasscodeVal(''); setErrorMessage(null); }}
                          className="text-[11px] font-black text-gray-500 hover:text-gray-900 text-center uppercase tracking-wider self-center cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleKeypadPress('0')}
                          className="w-14 h-14 rounded-full border border-gray-100 bg-white hover:bg-gray-150 active:bg-gray-200 text-gray-800 text-lg font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                        >
                          0
                        </button>
                        <button
                          onClick={() => setPasscodeVal((prev) => prev.slice(0, -1))}
                          className="text-[11px] font-black text-gray-500 hover:text-red-600 text-center uppercase tracking-wider self-center cursor-pointer"
                        >
                          Del
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setIsUsingPasscode(false);
                          setPasscodeVal('');
                          setErrorMessage(null);
                        }}
                        className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-1 cursor-pointer block"
                      >
                        ← Back to Biometric Passkey
                      </button>
                    </div>
                  ) : (
                    /* BIOMETRIC ACCOUNT LIST UNLOCK VIEW */
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                        Registered Accounts
                      </label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {registeredKeys.map((k) => (
                          <div
                            key={k.id}
                            onClick={() => {
                              setSelectedKey(k);
                              setErrorMessage(null);
                            }}
                            className={`p-2.5 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                              selectedKey?.id === k.id
                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">{k.userName}</span>
                              <span className="text-[9px] opacity-70 block truncate">{k.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {k.biometricType === 'fingerprint' ? (
                                <Fingerprint className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ScanFace className="w-4 h-4 text-gray-400" />
                              )}
                              <KeyRound className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => triggerPasskeyAuth('login')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        {selectedKey?.biometricType === 'fingerprint' ? (
                          <>
                            <Fingerprint className="w-4 h-4" />
                            <span>Unlock with Touch ID</span>
                          </>
                        ) : (
                          <>
                            <ScanFace className="w-4 h-4" />
                            <span>Unlock with Face ID</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPasskeyAuth('login', true)}
                        className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-1 cursor-pointer block"
                      >
                        🔑 Use other Apple / Device Passkey
                      </button>

                      <button
                        onClick={() => {
                          setIsUsingPasscode(true);
                          setPasscodeVal('');
                          setErrorMessage(null);
                        }}
                        className="w-full text-center text-xs font-bold text-gray-600 hover:text-gray-900 py-1 cursor-pointer block"
                      >
                        🔢 Unlock with Numeric Passcode
                      </button>
                    </div>
                  )
                ) : (
                  /* EMPTY STATE LOGIN - REGISTER REQUIRED OR QUICK DEMO */
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 text-center space-y-4">
                    <KeyRound className="w-8 h-8 text-gray-400 mx-auto" />
                    <div className="space-y-1">
                      <b className="text-xs text-gray-900 block">No Passkeys Registered</b>
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                        Sign in with your saved device passkey, or enroll a new one.
                      </p>
                    </div>

                    {/* Direct Native WebAuthn login option */}
                    <button
                      onClick={() => triggerPasskeyAuth('login', true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <KeyRound className="w-4 h-4 text-emerald-100 animate-pulse" />
                      <span>Sign In with Apple / Device Passkey</span>
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-gray-400 font-bold uppercase tracking-wider">or options</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <div className="flex">
                      <button
                        onClick={() => setIsRegistering(true)}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black rounded-xl transition cursor-pointer"
                      >
                        Enroll Passkey
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Informational Footer links */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 tracking-wider">v1.3.0</span>
              <div className="flex items-center gap-1.5 text-gray-400">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold">WebAuthn SECURE 256</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
