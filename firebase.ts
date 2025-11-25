import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/functions";

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

// DIRECT CONFIGURATION (Hardcoded for stability)
const firebaseConfig = {
  apiKey: "AIzaSyBIUT0mFU1THhZIE1yfNbT6ULdpHg8gOlU",
  authDomain: "bunnytrack-app.firebaseapp.com",
  projectId: "bunnytrack-app",
  storageBucket: "bunnytrack-app.firebasestorage.app",
  messagingSenderId: "550171679504",
  appId: "1:550171679504:web:ff991001c014dbe34e2395"
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