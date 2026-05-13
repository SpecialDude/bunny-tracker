
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RabbitList } from './components/RabbitList';
import { HutchList } from './components/HutchList';
import { BreedingList } from './components/BreedingList';
import { FinanceList } from './components/FinanceList';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { FarmProvider } from './contexts/FarmContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Loader2 } from 'lucide-react';
import { FarmService } from './services/farmService';

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const { user, loading: authLoading, enterDemoMode } = useAuth();
  
  // Landing page vs Login toggle for unauthenticated users
  const [showLanding, setShowLanding] = useState(true);

  // Farm check state
  const [hasFarm, setHasFarm] = useState<boolean | null>(null);
  const [checkingFarm, setCheckingFarm] = useState(false);

  useEffect(() => {
    const checkFarmStatus = async () => {
      if (!user) return;
      setCheckingFarm(true);
      try {
        const farm = await FarmService.getFarm();
        setHasFarm(!!farm);
      } catch (error) {
        console.error("Error checking farm status:", error);
        setHasFarm(false);
      } finally {
        setCheckingFarm(false);
      }
    };

    if (user) {
      checkFarmStatus();
    }
  }, [user]);

  if (authLoading || (user && checkingFarm)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-farm-600" size={48} />
           <p className="text-gray-500 font-medium">Loading your farm...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Show landing page or login based on user action
    if (showLanding) {
      return (
        <LandingPage 
          onGetStarted={() => setShowLanding(false)} 
          onDemo={() => {
            enterDemoMode();
            setShowLanding(false);
          }}
        />
      );
    }
    return <Login onBackToLanding={() => setShowLanding(true)} />;
  }

  // If user is logged in but hasn't set up a farm yet
  if (hasFarm === false) {
    return <Onboarding onComplete={() => setHasFarm(true)} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} />;
      case 'rabbits': return <RabbitList />;
      case 'hutches': return <HutchList />;
      case 'breeding': return <BreedingList />;
      case 'finances': return <FinanceList />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderContent()}
    </Layout>
  );
};

import * as Sentry from '@sentry/react';

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-red-600 font-medium">Something went wrong. Please refresh the page.</p></div>}>
      <AuthProvider>
        <AlertProvider>
          <FarmProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </FarmProvider>
        </AlertProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
