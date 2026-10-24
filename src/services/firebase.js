/**
 * MentorFlow Cloud Database Service (Firebase Firestore)
 * Provides real-time sync across trainers and controllers on mobile and desktop.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from './firebaseConfig.js';

const FIREBASE_CONFIG_KEY = 'mentorflow_firebase_config_v1';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.statusListeners = new Set();
    this.unsubscribers = [];
    this.connectionStatus = 'disconnected'; // 'connected' | 'connecting' | 'disconnected' | 'error'
    this.connectionError = null;

    this.initFromActiveConfig();
  }

  getActiveConfig() {
    // 1. Check in-code configuration first (Highest priority for official deployment)
    if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId) {
      return FIREBASE_CONFIG;
    }
    // 2. Fall back to local storage if user entered it through UI
    return this.getStoredConfig();
  }

  getStoredConfig() {
    try {
      const stored = localStorage.getItem(FIREBASE_CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read stored Firebase config:', e);
    }
    return null;
  }

  isConfigured() {
    const cfg = this.getActiveConfig();
    return Boolean(cfg && cfg.projectId && cfg.apiKey);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.getStatus());
    return () => this.statusListeners.delete(callback);
  }

  notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach(cb => {
      try { cb(status); } catch (e) { console.error(e); }
    });
  }

  getStatus() {
    const activeCfg = this.getActiveConfig();
    return {
      status: this.connectionStatus,
      isConfigured: this.isConfigured(),
      projectId: activeCfg?.projectId || null,
      isInCode: Boolean(FIREBASE_CONFIG && FIREBASE_CONFIG.projectId),
      error: this.connectionError
    };
  }

  async initFromActiveConfig() {
    const config = this.getActiveConfig();
    if (!config || !config.projectId || !config.apiKey) {
      this.connectionStatus = 'disconnected';
      this.notifyStatus();
      return false;
    }

    return await this.connect(config);
  }

  async connect(config) {
    this.connectionStatus = 'connecting';
    this.connectionError = null;
    this.notifyStatus();

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }

      this.db = getFirestore(this.app);

      // Attempt offline persistence
      try {
        await enableIndexedDbPersistence(this.db);
      } catch (err) {
        if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
          console.warn('Firestore offline persistence warning:', err);
        }
      }

      // Save valid config
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
      this.isInitialized = true;
      this.connectionStatus = 'connected';
      this.notifyStatus();
      return { success: true };
    } catch (err) {
      console.error('Failed to initialize Firebase Firestore:', err);
      this.connectionStatus = 'error';
      this.connectionError = err.message || 'Connection failed';
      this.notifyStatus();
      return { success: false, error: err.message };
    }
  }

  disconnect() {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers = [];
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.connectionStatus = 'disconnected';
    this.connectionError = null;
    this.notifyStatus();
  }

  // --- Real-time Listeners ---
  subscribe(collectionName, onData, onError) {
    if (!this.db || !this.isInitialized) {
      return () => {};
    }

    try {
      const colRef = collection(this.db, collectionName);
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const items = [];
        snapshot.forEach(doc => {
          items.push({ ...doc.data(), id: doc.id });
        });
        onData(items);
      }, (err) => {
        console.warn(`Firestore subscription error for ${collectionName}:`, err);
        if (onError) onError(err);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.error(`Failed to subscribe to ${collectionName}:`, e);
      return () => {};
    }
  }

  // --- CRUD Operations ---
  async setDoc(collectionName, docId, data) {
    if (!this.db || !this.isInitialized) return null;
    try {
      const docRef = doc(this.db, collectionName, String(docId));
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e) {
      console.error(`Error saving document to ${collectionName}/${docId}:`, e);
      throw e;
    }
  }

  // Alias for setDoc
  async set(collectionName, docId, data) {
    return this.setDoc(collectionName, docId, data);
  }

  async deleteDoc(collectionName, docId) {
    if (!this.db || !this.isInitialized) return null;
    try {
      const docRef = doc(this.db, collectionName, String(docId));
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error(`Error deleting document from ${collectionName}/${docId}:`, e);
      throw e;
    }
  }

  // Alias for deleteDoc
  async delete(collectionName, docId) {
    return this.deleteDoc(collectionName, docId);
  }

  async batchSync(collectionName, items) {
    if (!this.db || !this.isInitialized || !Array.isArray(items)) return null;
    try {
      const batch = writeBatch(this.db);
      items.forEach(item => {
        if (!item.id) return;
        const ref = doc(this.db, collectionName, String(item.id));
        batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error(`Error batch syncing to ${collectionName}:`, e);
      throw e;
    }
  }

  async fetchAll(collectionName) {
    if (!this.db || !this.isInitialized) return [];
    try {
      const colRef = collection(this.db, collectionName);
      const snapshot = await getDocs(colRef);
      const items = [];
      snapshot.forEach(doc => {
        items.push({ ...doc.data(), id: doc.id });
      });
      return items;
    } catch (e) {
      console.error(`Error fetching collection ${collectionName}:`, e);
      return [];
    }
  }
}

export const firebaseService = new FirebaseService();
