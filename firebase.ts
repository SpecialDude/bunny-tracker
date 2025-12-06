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

// Debug logging
console.log("[Firebase] Initializing with project:", firebaseConfig.projectId);

let app;
try {
  // Singleton initialization using Compat API
  app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
  console.log("[Firebase] Initialization successful");
} catch (error) {
  console.error("[Firebase] Critical Initialization Error:", error);
}

// Export services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const functions = firebase.functions();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default app;