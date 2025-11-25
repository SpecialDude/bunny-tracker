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
// CONFIGURATION INSTRUCTIONS
// ------------------------------------------------------------------
// 1. Go to Firebase Console > Project Settings > General
// 2. Scroll to "Your apps" and select the Web app (</>)
// 3. Copy the "firebaseConfig" object properties
// 4. Paste them below into `manualConfig` OR set up your .env file
// ------------------------------------------------------------------

const manualConfig = {
  apiKey: "AIzaSyBIUT0mFU1THhZIE1yfNbT6ULdpHg8gOlU",
  authDomain: "bunnytrack-app.firebaseapp.com",
  projectId: "bunnytrack-app",
  storageBucket: "bunnytrack-app.firebasestorage.app",
  messagingSenderId: "550171679504",
  appId: "1:550171679504:web:ff991001c014dbe34e2395"
};

const envConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY") || getEnvVar("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN") || getEnvVar("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID") || getEnvVar("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET") || getEnvVar("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID") || getEnvVar("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID") || getEnvVar("REACT_APP_FIREBASE_APP_ID")
};

// Use Environment variables if they exist, otherwise fallback to manualConfig
const firebaseConfig = envConfig.apiKey ? envConfig : manualConfig;

// Validation Check
if (firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY") {
  console.error(
    "%c CRITICAL FIREBASE CONFIG ERROR ", 
    "background: red; color: white; font-size: 20px; font-weight: bold;"
  );
  console.error(
    "You have not configured your Firebase keys in firebase.ts.\n" +
    "Please open firebase.ts and fill in the manualConfig object with your project details."
  );
}

// Singleton initialization using Compat API
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Debug helper for Authorized Domains
if (typeof window !== 'undefined') {
  console.log(`[Firebase Setup] Current Hostname: ${window.location.hostname}`);
  console.log(`[Firebase Setup] Current Protocol: ${window.location.protocol}`);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const functions = firebase.functions();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default app;