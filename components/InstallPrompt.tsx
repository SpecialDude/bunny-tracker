import React, { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Listen for Chrome/Android install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) return null;

  // Render Android/Chrome Install Button
  if (deferredPrompt) {
    return (
      <button 
        onClick={handleInstallClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-farm-700 bg-farm-50 hover:bg-farm-100 rounded-lg transition-colors border border-farm-200"
      >
        <Download size={20} />
        Install App
      </button>
    );
  }

  // Render iOS Instructions (Since iOS doesn't support programmatic install)
  if (isIOS) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
        <p className="flex items-center gap-2 font-medium text-gray-800 mb-1">
          <Share size={14} /> Install on iPhone:
        </p>
        <p>Tap <span className="font-bold">Share</span> then <span className="font-bold">Add to Home Screen</span>.</p>
      </div>
    );
  }

  return null;
};
