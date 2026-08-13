import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { PromptItem, Collection, HistoryLog, UserSettings } from '../types';
import {
  INITIAL_PROMPTS,
  INITIAL_COLLECTIONS,
  INITIAL_HISTORY,
  DEFAULT_SETTINGS,
} from '../data/initialData';

/**
 * Sync single prompt to Firestore
 */
export async function syncPromptToFirestore(prompt: PromptItem): Promise<void> {
  try {
    const ref = doc(db, 'prompts', prompt.id);
    await setDoc(ref, prompt, { merge: true });
  } catch (err) {
    console.warn('Firestore prompt sync error:', err);
  }
}

/**
 * Delete prompt from Firestore
 */
export async function deletePromptFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, 'prompts', id);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore prompt delete error:', err);
  }
}

/**
 * Sync collection to Firestore
 */
export async function syncCollectionToFirestore(col: Collection): Promise<void> {
  try {
    const ref = doc(db, 'collections', col.id);
    await setDoc(ref, col, { merge: true });
  } catch (err) {
    console.warn('Firestore collection sync error:', err);
  }
}

/**
 * Delete collection from Firestore
 */
export async function deleteCollectionFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, 'collections', id);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore collection delete error:', err);
  }
}

/**
 * Sync history entry to Firestore
 */
export async function syncHistoryToFirestore(entry: HistoryLog): Promise<void> {
  try {
    const ref = doc(db, 'history', entry.id);
    await setDoc(ref, entry, { merge: true });
  } catch (err) {
    console.warn('Firestore history sync error:', err);
  }
}

/**
 * Sync settings to Firestore
 */
export async function syncSettingsToFirestore(settings: UserSettings): Promise<void> {
  try {
    const ref = doc(db, 'settings', 'user_settings');
    await setDoc(ref, settings, { merge: true });
  } catch (err) {
    console.warn('Firestore settings sync error:', err);
  }
}

/**
 * Real-time listener for prompts collection
 */
export function subscribeToPromptsRealtime(callback: (prompts: PromptItem[]) => void) {
  const colRef = collection(db, 'prompts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: PromptItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as PromptItem);
      });
      items.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      callback(items);
    },
    (error) => {
      console.warn('Firestore prompts realtime error:', error);
    }
  );
}

/**
 * Real-time listener for collections
 */
export function subscribeToCollectionsRealtime(callback: (collections: Collection[]) => void) {
  const colRef = collection(db, 'collections');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Collection[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Collection);
      });
      callback(items);
    },
    (error) => {
      console.warn('Firestore collections realtime error:', error);
    }
  );
}

/**
 * Clear all prompts from Firestore
 */
export async function clearAllPromptsInFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'prompts'));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore clear all prompts error:', err);
  }
}

/**
 * Clear all collections from Firestore
 */
export async function clearAllCollectionsInFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'collections'));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore clear all collections error:', err);
  }
}

/**
 * Clear all history entries from Firestore
 */
export async function clearAllHistoryInFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'history'));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore clear all history error:', err);
  }
}

/**
 * Real-time listener for activity history
 */
export function subscribeToHistoryRealtime(callback: (history: HistoryLog[]) => void) {
  const colRef = collection(db, 'history');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: HistoryLog[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as HistoryLog);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    (error) => {
      console.warn('Firestore history realtime error:', error);
    }
  );
}

/**
 * Real-time listener for settings
 */
export function subscribeToSettingsRealtime(callback: (settings: UserSettings) => void) {
  const docRef = doc(db, 'settings', 'user_settings');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserSettings);
      }
    },
    (error) => {
      console.warn('Firestore settings realtime error:', error);
    }
  );
}

/**
 * Seed Firestore with initial data if empty
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    const hasSeeded = localStorage.getItem('promptforge_has_seeded');
    if (hasSeeded) return;

    const snapshot = await getDocs(collection(db, 'prompts'));
    if (snapshot.empty) {
      console.log('Seeding initial workspace data to Firestore...');
      const batch = writeBatch(db);

      INITIAL_PROMPTS.forEach((p) => {
        batch.set(doc(db, 'prompts', p.id), p);
      });

      INITIAL_COLLECTIONS.forEach((c) => {
        batch.set(doc(db, 'collections', c.id), c);
      });

      INITIAL_HISTORY.forEach((h) => {
        batch.set(doc(db, 'history', h.id), h);
      });

      batch.set(doc(db, 'settings', 'user_settings'), DEFAULT_SETTINGS);

      await batch.commit();
      localStorage.setItem('promptforge_has_seeded', 'true');
      console.log('Firestore initial seeding completed successfully!');
    } else {
      localStorage.setItem('promptforge_has_seeded', 'true');
    }
  } catch (err) {
    console.warn('Failed to seed Firestore:', err);
  }
}
