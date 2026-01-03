
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { Vault, VaultType, Transaction, Autopay, Notification, User, RevenueRecord } from "../types";

// Firebase configuration using provided project credentials
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyCAraCMzeV7dizNSSJuoGnY5kyh8btQpR8",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "smartwalletai-92d10.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "smartwalletai-92d10",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "smartwalletai-92d10.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "677662690594",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:677662690594:web:57bc91ce581d5bcfb5e97b",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-C91KCY0J4X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Safe Analytics initialization
if (typeof window !== "undefined") {
  isSupported().then(supported => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {
    console.debug("Analytics not supported in this environment.");
  });
}

export const INITIAL_VAULTS_TEMPLATE: Vault[] = [
  { id: 'v1', type: VaultType.LIFESTYLE, limit: 10000, spent: 0, isLocked: false },
  { id: 'v2', type: VaultType.FOOD, limit: 5000, spent: 0, isLocked: false },
  { id: 'v3', type: VaultType.EMERGENCY, limit: 20000, spent: 0, isLocked: true, pin: '1234' },
  { id: 'v4', type: VaultType.BUSINESS, limit: 15000, spent: 0, isLocked: false },
  { id: 'v5', type: VaultType.BILLS, limit: 8000, spent: 0, isLocked: false },
];

export const db = {
  getCurrentAuthUser: () => auth.currentUser,

  onAuthChange: (callback: (user: any) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getUserProfile: async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(firestore, "users", uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  },

  verifyUser: async (email: string, pass: string): Promise<User | null> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await getDoc(doc(firestore, "users", cred.user.uid));
      return userDoc.exists() ? (userDoc.data() as User) : null;
    } catch (e) {
      throw e;
    }
  },

  registerUser: async (username: string, email: string, pass: string): Promise<User | null> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: User = {
        username,
        email,
        createdAt: new Date().toISOString(),
        totalBudget: 100000,
        currentBalance: 50000
      };
      
      // Persist Profile
      await setDoc(doc(firestore, "users", cred.user.uid), newUser);
      
      // Initialize Default Cloud Vaults
      const batchPromises = INITIAL_VAULTS_TEMPLATE.map(v => 
        setDoc(doc(firestore, `users/${cred.user.uid}/vaults`, v.id), v)
      );
      await Promise.all(batchPromises);
      
      // First welcome notification
      await addDoc(collection(firestore, `users/${cred.user.uid}/notifications`), {
        title: 'Cloud Identity Established',
        message: 'Your biometric-ready vaults are synced and ready for deployment.',
        priority: 'normal',
        timestamp: Date.now(),
        read: false
      });

      return newUser;
    } catch (e) {
      throw e;
    }
  },

  updateUserProfile: async (uid: string, updates: Partial<User>) => {
    const userRef = doc(firestore, "users", uid);
    await updateDoc(userRef, updates);
    return (await getDoc(userRef)).data() as User;
  },

  getVaults: async (uid: string): Promise<Vault[]> => {
    const snap = await getDocs(collection(firestore, `users/${uid}/vaults`));
    return snap.docs.map(d => d.data() as Vault);
  },

  setVaults: async (uid: string, vaults: Vault[]) => {
    const batchPromises = vaults.map(v => 
      setDoc(doc(firestore, `users/${uid}/vaults`, v.id), v)
    );
    await Promise.all(batchPromises);
  },
  
  getTransactions: async (uid: string): Promise<Transaction[]> => {
    const q = query(collection(firestore, `users/${uid}/transactions`), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
  },

  addTransaction: async (uid: string, tx: Transaction) => {
    await addDoc(collection(firestore, `users/${uid}/transactions`), tx);
  },

  getNotifications: async (uid: string): Promise<Notification[]> => {
    const q = query(collection(firestore, `users/${uid}/notifications`), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
  },

  markNotificationsRead: async (uid: string, notificationIds: string[]) => {
    const promises = notificationIds.map(id => 
      updateDoc(doc(firestore, `users/${uid}/notifications`, id), { read: true })
    );
    await Promise.all(promises);
  },

  pushNotification: async (uid: string, notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif = { ...notif, timestamp: Date.now(), read: false };
    const docRef = await addDoc(collection(firestore, `users/${uid}/notifications`), newNotif);
    return { ...newNotif, id: docRef.id } as Notification;
  },

  logout: async () => {
    await signOut(auth);
  }
};
