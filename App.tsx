import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RabbitList } from './components/RabbitList';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';

// Placeholder components
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
    <div className="text-6xl mb-4">🚧</div>
    <h2 className="text-2xl font-bold text-gray-600">{title}</h2>
    <p>This module is under construction.</p>
  </div>
);

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-farm-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'rabbits': return <RabbitList />;
      case 'hutches': return <Placeholder title="Hutch Management" />;
      case 'breeding': return <Placeholder title="Breeding Workflow" />;
      case 'finances': return <Placeholder title="Financial Tracking" />;
      case 'settings': return <Placeholder title="Farm Settings" />;
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;