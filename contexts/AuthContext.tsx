import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, googleProvider } from '../firebase';

// Types
type User = firebase.User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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
    if (DEV_MODE_NO_AUTH) {
      // Mock User
      setUser({
        uid: 'dev-owner-123',
        email: 'dev@sunnyrabbits.com',
        displayName: 'Dev Farmer',
        photoURL: null
      } as any);
      setLoading(false);
      return;
    }

    // Real Firebase Auth
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (DEV_MODE_NO_AUTH) return;
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (DEV_MODE_NO_AUTH) {
      window.location.reload(); 
      return;
    }
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};