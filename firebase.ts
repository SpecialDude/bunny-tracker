import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/functions";

// Helper to get env vars from Vite (import.meta.env) or CRA/Node (process.env)
const getEnvVar = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

// 1. Priority: Environment Variables (from .env file)
const envConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY") || getEnvVar("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN") || getEnvVar("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID") || getEnvVar("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET") || getEnvVar("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID") || getEnvVar("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID") || getEnvVar("REACT_APP_FIREBASE_APP_ID")
};

// 2. Fallback: Manual Object (Only used if Env Vars are missing)
// We set these to placeholders so the validation logic triggers 
// instead of trying to connect to a non-existent domain (which causes timeouts).
const manualConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Select Config
const firebaseConfig = envConfig.apiKey ? envConfig : manualConfig;

// Debugging
if (envConfig.apiKey) {
  console.log("[Firebase Setup] Successfully loaded configuration from Environment Variables.");
} else {
  console.log("[Firebase Setup] Environment variables missing. Falling back to manualConfig.");
}

// Validation Check
if (firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY") {
  console.error(
    "%c CRITICAL FIREBASE CONFIG ERROR ", 
    "background: red; color: white; font-size: 20px; font-weight: bold;"
  );
  console.error(
    "You have not configured your Firebase keys.\n" +
    "1. Create a .env file with VITE_FIREBASE_API_KEY, etc.\n" +
    "2. OR edit firebase.ts manually.\n" +
    "3. Restart your dev server (npm run dev)."
  );
}

// Singleton initialization using Compat API
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Debug helper for Authorized Domains
if (typeof window !== 'undefined') {
  console.log(`[Firebase Setup] Current Hostname: ${window.location.hostname}`);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const functions = firebase.functions();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default app;