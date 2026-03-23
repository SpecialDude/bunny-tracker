
import React, { createContext, useContext, useState, useEffect } from 'react';
import { FarmService } from '../services/farmService';
import { useAuth } from './AuthContext';
import { Breed } from '../types';

interface FarmContextType {
  farmName: string;
  currency: string;
  currencySymbol: string;
  breeds: Breed[];
  transactionCategories: string[];
  defaultWeaningDays: number;
  notificationLeadDays: number;
  loading: boolean;
  refreshFarm: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType>({} as FarmContextType);

export const useFarm = () => useContext(FarmContext);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [farmName, setFarmName] = useState('My Farm');
  const [currency, setCurrency] = useState('USD');
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<string[]>([]);
  const [defaultWeaningDays, setDefaultWeaningDays] = useState(35);
  const [notificationLeadDays, setNotificationLeadDays] = useState(3);
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
        setBreeds(settings.breeds || []);
        setTransactionCategories(settings.transactionCategories || []);
        if (settings.defaultWeaningDays) {
           setDefaultWeaningDays(settings.defaultWeaningDays);
        }
        if (settings.notificationLeadDays !== undefined) {
           setNotificationLeadDays(settings.notificationLeadDays);
        }
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
      breeds,
      transactionCategories,
      defaultWeaningDays,
      notificationLeadDays,
      loading, 
      refreshFarm 
    }}>
      {children}
    </FarmContext.Provider>
  );
};