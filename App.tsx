import React, { useState, useEffect } from 'react';
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
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';
import { FarmService } from './services/farmService';

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const { user, loading: authLoading } = useAuth();
  
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
    return <Login />;
  }

  // If user is logged in but hasn't set up a farm yet
  if (hasFarm === false) {
    return <Onboarding onComplete={() => setHasFarm(true)} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'rabbits': return <RabbitList />;
      case 'hutches': return <HutchList />;
      case 'breeding': return <BreedingList />;
      case 'finances': return <FinanceList />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderContent()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;