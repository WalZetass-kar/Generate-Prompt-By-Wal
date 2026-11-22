import { CustomAIKeys } from '../types';

/**
 * In-memory runtime cache of user's custom AI keys synced exclusively from Firebase Firestore.
 * Zero localStorage is used anywhere in the application.
 */
let runtimeCustomApiKeys: CustomAIKeys | undefined = undefined;

export function setRuntimeCustomApiKeys(keys?: CustomAIKeys): void {
  runtimeCustomApiKeys = keys ? { ...keys } : undefined;
}

export function getCustomApiKeys(): CustomAIKeys | undefined {
  return runtimeCustomApiKeys;
}
