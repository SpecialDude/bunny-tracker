import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, googleProvider } from '../firebase';
import { FarmService } from '../services/farmService';

// Types
type User = firebase.User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set to false to enable real Firebase Authentication
  const DEV_MODE_NO_AUTH = false;

  useEffect(() => {
    // Real Firebase Auth Listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await auth.signInWithPopup(googleProvider);
      if (result.user) {
        // Sync user details to Firestore
        await FarmService.syncUser(result.user);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const enterDemoMode = () => {
      // Mock User for Demo
      setUser(null); // Ensure no real auth
      // We handle demo logic in services based on null auth
      // But to trigger UI updates we might need a dummy object if strictly typed elsewhere
      // For now, let's keep user null and use a separate flag or specific mock logic in components
      // Actually, to make the Layout render, we need a Mock User object.
      
      const mockUser = {
        uid: 'demo-user-123',
        email: 'demo@bunnytrack.com',
        displayName: 'Demo Farmer',
        photoURL: null,
        emailVerified: true,
        isAnonymous: true,
        // ... add other minimal properties needed by firebase.User type casting
      } as unknown as User;

      setUser(mockUser);
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, enterDemoMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};