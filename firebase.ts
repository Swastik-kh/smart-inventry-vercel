
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

/**
 * Enhanced environment variable accessor.
 * Prioritizes process.env (substituted by Vite build) then import.meta.env.
 */
const getEnv = (key: string, defaultValue: string): string => {
  // Check process.env (mapped in vite.config.ts)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // Check Vite's built-in env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key] || defaultValue;
  }
  return defaultValue;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyBNgp4ZKBq_sHjVC0OGwSidhzCOtoGYR4k"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "smart-health-dce40.firebaseapp.com"),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL", "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "smart-health-dce40"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "smart-health-dce40.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "81529782106"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:81529782106:web:286029a5dc050cd0423d63"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-CSK81WMJEQ")
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);