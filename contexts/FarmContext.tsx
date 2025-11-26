import React, { createContext, useContext, useState, useEffect } from 'react';
import { FarmService } from '../services/farmService';
import { useAuth } from './AuthContext';

interface FarmContextType {
  farmName: string;
  currency: string;
  currencySymbol: string;
  loading: boolean;
  refreshFarm: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType>({} as FarmContextType);

export const useFarm = () => useContext(FarmContext);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [farmName, setFarmName] = useState('My Farm');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);

  const getSymbol = (code: string) => {
    switch (code) {
      case 'NGN': return '₦';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'USD': default: return '$';
    }
  };

  const refreshFarm = async () => {
    if (!user) return;
    try {
      const settings = await FarmService.getFarmSettings();
      if (settings) {
        setFarmName(settings.name);
        setCurrency(settings.currency);
      }
    } catch (error) {
      console.error("Error fetching farm context:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFarm();
  }, [user]);

  return (
    <FarmContext.Provider value={{ 
      farmName, 
      currency, 
      currencySymbol: getSymbol(currency),
      loading, 
      refreshFarm 
    }}>
      {children}
    </FarmContext.Provider>
  );
};