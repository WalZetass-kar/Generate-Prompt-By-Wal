import { Collection, PromptItem, HistoryLog, UserSettings } from '../types';
import { INITIAL_COLLECTIONS, INITIAL_PROMPTS, INITIAL_HISTORY, DEFAULT_SETTINGS } from '../data/initialData';
import { syncHistoryToFirestore } from './firebaseStorage';

const KEYS = {
  PROMPTS: 'promptforge_prompts_v1',
  COLLECTIONS: 'promptforge_collections_v1',
  HISTORY: 'promptforge_history_v1',
  SETTINGS: 'promptforge_settings_v1',
};

export function getStoredPrompts(): PromptItem[] {
  try {
    const raw = localStorage.getItem(KEYS.PROMPTS);
    if (!raw) {
      localStorage.setItem(KEYS.PROMPTS, JSON.stringify(INITIAL_PROMPTS));
      return INITIAL_PROMPTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROMPTS;
  }
}

export function saveStoredPrompts(prompts: PromptItem[]): void {
  try {
    localStorage.setItem(KEYS.PROMPTS, JSON.stringify(prompts));
  } catch (e) {
    console.error('Failed to save prompts to localStorage', e);
  }
}

export function clearStoredPrompts(): void {
  try {
    localStorage.setItem(KEYS.PROMPTS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear prompts in localStorage', e);
  }
}

export function getStoredCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(KEYS.COLLECTIONS);
    if (!raw) {
      localStorage.setItem(KEYS.COLLECTIONS, JSON.stringify(INITIAL_COLLECTIONS));
      return INITIAL_COLLECTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_COLLECTIONS;
  }
}

export function saveStoredCollections(collections: Collection[]): void {
  try {
    localStorage.setItem(KEYS.COLLECTIONS, JSON.stringify(collections));
  } catch (e) {
    console.error('Failed to save collections to localStorage', e);
  }
}

export function clearStoredCollections(): void {
  try {
    localStorage.setItem(KEYS.COLLECTIONS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear collections in localStorage', e);
  }
}

export function getStoredHistory(): HistoryLog[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) {
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_HISTORY;
  }
}

export function saveStoredHistory(history: HistoryLog[]): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history to localStorage', e);
  }
}

export function clearStoredHistory(): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear history in localStorage', e);
  }
}

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function addHistoryEntry(
  promptTitle: string,
  action: 'create' | 'update' | 'optimize' | 'translate' | 'restore',
  details: string,
  promptId?: string
): HistoryLog {
  const current = getStoredHistory();
  const newEntry: HistoryLog = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    promptId,
    promptTitle,
    action,
    timestamp: new Date().toISOString(),
    details,
  };
  const updated = [newEntry, ...current];
  saveStoredHistory(updated);
  syncHistoryToFirestore(newEntry);
  return newEntry;
}
