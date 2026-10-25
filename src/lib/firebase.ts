import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import rawConfig from "../../firebase-applet-config.json";

const env = typeof import.meta !== "undefined" ? (import.meta as any).env || {} : {};

// Explicit, validated configuration variables for hardened Firebase initialization
const firebaseConfig = {
  apiKey: rawConfig.apiKey || env.VITE_FIREBASE_API_KEY || "",
  authDomain: rawConfig.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0302741721.firebaseapp.com",
  projectId: rawConfig.projectId || env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0302741721",
  storageBucket: rawConfig.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0302741721.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "710292044344",
  appId: rawConfig.appId || env.VITE_FIREBASE_APP_ID || "1:710292044344:web:6829cde242ef954c06c4cd",
  firestoreDatabaseId: rawConfig.firestoreDatabaseId || "ai-studio-tendertrackingap-9f434cfb-0357-4e18-b5cb-149e70c03d8a"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

let db: any;
try {
  db = initializeFirestore(app, { ignoreUndefinedProperties: true }, firestoreDatabaseId);
} catch (e) {
  db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}

let storage: any = null;
try {
  const bucket = firebaseConfig.storageBucket;
  storage = bucket ? getStorage(app, `gs://${bucket.replace(/^gs:\/\//, '')}`) : getStorage(app);
} catch (e) {
  try {
    storage = getStorage(app);
  } catch (err) {
    console.warn("Firebase storage init notice:", err);
    storage = null;
  }
}

export { db, app, storage, firebaseConfig };
