import React, { useState, useEffect } from 'react';
import { Rabbit, AlertTriangle, ExternalLink, Info, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { signInWithGoogle, enterDemoMode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isEnvironmentError, setIsEnvironmentError] = useState(false);
  const [isBlob, setIsBlob] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol;
    
    // Check for file protocol
    if (protocol === 'file:') {
      setError("You are running this file directly (file://). Firebase requires a local server (http:// or https://). Please run 'npm start', 'vite', or use a Live Server extension.");
      setIsEnvironmentError(true);
    } 
    // Check for Blob protocol (Cloud IDEs)
    else if (protocol === 'blob:') {
      setIsBlob(true);
      setError("You are running in a restricted 'Blob' preview mode. Google Sign-In requires a standard web address.");
      setIsEnvironmentError(true);
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        setError("Configuration Error: Firebase API Key is missing. Please check your .env file or firebase.ts.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled by user.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain not allowed: Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized Domains.`);
      } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
        setIsEnvironmentError(true);
        setError("This preview environment blocks Google Sign-In. You must open the app in a separate browser tab.");
      } else {
        setError(err.message || "Failed to sign in. Please check console.");
      }
    }
  };

  const openInNewTab = () => {
    if (isBlob) {
      alert("Cannot open a new tab from this preview. Please use your code editor's toolbar to 'Open Preview in New Tab'.");
      return;
    }
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="inline-flex p-4 bg-farm-100 rounded-full mb-4">
            <Rabbit size={48} className="text-farm-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">BunnyTrack</h2>
          <p className="mt-2 text-gray-500">Manage your rabbitry with professional tools.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-3 text-left">
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
                   How to fix this:
                 </p>
                 <p>Look for the <strong>"Open Preview in New Tab"</strong> or <strong>"Pop out"</strong> icon in your code editor's toolbar (usually top-right of the preview pane).</p>
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
            onClick={handleLogin}
            disabled={isBlob}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 font-medium transition-all ${isBlob ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5" 
            />
            Sign in with Google
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:outline-none" placeholder="farmer@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:outline-none" placeholder="••••••••" />
            </div>
            <button className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white rounded-lg font-bold shadow-md transition-colors">
              Sign In
            </button>
          </form>

          {/* Demo Mode Link */}
          <div className="pt-4 border-t border-gray-100">
             <button 
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