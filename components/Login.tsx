import React, { useState, useEffect } from 'react';
import { Rabbit, AlertTriangle, ExternalLink, Info, PlayCircle, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, enterDemoMode } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Environment checks
  const [isEnvironmentError, setIsEnvironmentError] = useState(false);
  const [isBlob, setIsBlob] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const protocol = window.location.protocol;
    if (protocol === 'file:') {
      setError("You are running this file directly (file://). Firebase requires a local server.");
      setIsEnvironmentError(true);
    } else if (protocol === 'blob:') {
      setIsBlob(true);
      setError("You are running in a restricted 'Blob' preview mode. Google Sign-In requires a standard web address.");
      setIsEnvironmentError(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !name) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
    console.error("Auth Error:", err);
    if (err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
      setError("Configuration Error: Firebase API Key is missing.");
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      setError("Invalid email or password.");
    } else if (err.code === 'auth/email-already-in-use') {
      setError("This email is already registered. Please sign in.");
    } else if (err.code === 'auth/popup-closed-by-user') {
      setError("Sign-in cancelled.");
    } else if (err.code === 'auth/unauthorized-domain') {
      setError(`Domain not allowed: Please whitelist "${window.location.hostname}" in Firebase Console.`);
    } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
      setIsEnvironmentError(true);
      setError("This preview environment blocks Google Sign-In. Use Email/Password or open in new tab.");
    } else {
      setError(err.message || "Authentication failed.");
    }
  };

  const openInNewTab = () => {
    if (isBlob) {
      alert("Please use your code editor's toolbar to 'Open Preview in New Tab'.");
      return;
    }
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex p-4 bg-farm-100 rounded-full mb-4">
            <Rabbit size={48} className="text-farm-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">BunnyTrack</h2>
          <p className="mt-2 text-gray-500">Manage your rabbitry with professional tools.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-3 text-left animate-pulse">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-red-700 font-medium">Authentication Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            
            {isBlob ? (
               <div className="mt-2 p-3 bg-white rounded border border-red-100 text-sm text-gray-700">
                 <p className="font-semibold flex items-center gap-2 mb-1">
                   <Info size={16} className="text-blue-500"/>
                   Fix:
                 </p>
                 <p>Look for the <strong>"Open in New Tab"</strong> icon in your editor.</p>
               </div>
            ) : (
              isEnvironmentError && (
                <button 
                  onClick={openInNewTab}
                  className="mt-1 flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
                >
                  <ExternalLink size={16} />
                  Open in New Browser Tab
                </button>
              )
            )}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isBlob || loading}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 font-medium transition-all ${isBlob ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5" 
            />
            {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or with email</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={18} />
                  </span>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:outline-none" 
                    placeholder="John Doe" 
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={18} />
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:outline-none" 
                  placeholder="farmer@example.com" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:outline-none" 
                  placeholder="••••••••" 
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="text-center text-sm">
             {mode === 'signin' ? (
               <p className="text-gray-600">
                 Don't have an account?{' '}
                 <button onClick={() => setMode('signup')} className="text-farm-600 font-bold hover:underline">
                   Sign Up
                 </button>
               </p>
             ) : (
               <p className="text-gray-600">
                 Already have an account?{' '}
                 <button onClick={() => setMode('signin')} className="text-farm-600 font-bold hover:underline">
                   Sign In
                 </button>
               </p>
             )}
          </div>

          {/* Demo Mode Link */}
          <div className="pt-4 border-t border-gray-100">
             <button 
               type="button"
               onClick={enterDemoMode}
               className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-farm-600 transition-colors"
             >
               <PlayCircle size={16} />
               Just testing? Enter Demo Mode (No Setup Required)
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};