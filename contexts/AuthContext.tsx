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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      if (result.user) {
        await FarmService.syncUser(result.user);
      }
    } catch (error) {
      console.error("Error signing in with Email:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      if (result.user) {
        // Update Profile with Name immediately
        await result.user.updateProfile({
          displayName: name
        });
        
        // Sync full details to Firestore
        await FarmService.syncUser({ 
          ...result.user, 
          displayName: name // Ensure name is passed even if auth object isn't updated locally yet
        });
      }
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const enterDemoMode = () => {
      // Mock User for Demo
      setUser(null); // Ensure no real auth
      
      const mockUser = {
        uid: 'demo-user-123',
        email: 'demo@bunnytrack.com',
        displayName: 'Demo Farmer',
        photoURL: null,
        emailVerified: true,
        isAnonymous: true,
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      enterDemoMode, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};