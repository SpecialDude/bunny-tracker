
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/functions";

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// ------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------

let app;
let authService;
let dbService;
let storageService;
let functionsService;
let googleProviderService;

try {
  // Only attempt to initialize if we have a config, otherwise catch error below
  if (!firebaseConfig.apiKey) {
    throw new Error("Missing Firebase API Key");
  }

  // Singleton initialization using Compat API
  app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
  
  // Initialize services only if app init succeeded
  authService = firebase.auth();
  dbService = firebase.firestore();
  storageService = firebase.storage();
  functionsService = firebase.functions();
  googleProviderService = new firebase.auth.GoogleAuthProvider();
  
} catch (error) {
  // We do NOT re-throw here. We let the services be undefined.
  // The UI (AuthContext) will check for this and show a friendly error.
}

// Export services (may be undefined if init failed)
export const auth = authService;
export const db = dbService;
export const storage = storageService;
export const functions = functionsService;
export const googleProvider = googleProviderService;

export default app;
