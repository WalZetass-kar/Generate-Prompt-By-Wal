import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  PromptItem,
  Collection,
  HistoryLog,
  UserSettings,
  FormState,
  PRDFormState,
  QualityControlMeta,
  GeneratedImageItem,
  GeneratedVideoItem,
} from '../types';
import { DEFAULT_SETTINGS, LEGACY_SEEDED_IDS } from '../data/initialData';
import { handleFirestoreError, OperationType } from './firestoreError';

export type WorkspaceDocId = 'settings' | 'generator_draft' | 'prd_draft' | 'chat_preferences';

export interface GeneratorDraftSnapshot {
  id: string;
  timestamp: string;
  title: string;
  promptSnippet: string;
  formData: FormState;
  promptText: string;
}

export interface GeneratorDraftPayload {
  formData: FormState;
  generatedPrompt: string;
  variableValues?: Record<string, string>;
  qualityControl?: QualityControlMeta | null;
  assumptionsList?: string[];
  clarificationsList?: string[];
  draftHistory?: GeneratorDraftSnapshot[];
  updatedAtIso?: string;
}

export interface PRDDraftSnapshot {
  id: string;
  timestamp: string;
  title: string;
  contentSnippet: string;
  formData: PRDFormState;
  contentText: string;
}

export interface PRDDraftPayload {
  formData: PRDFormState;
  generatedPRD: string;
  variableValues?: Record<string, string>;
  activeTemplateId?: string | null;
  draftHistory?: PRDDraftSnapshot[];
  updatedAtIso?: string;
}

export interface ChatPreferencesPayload {
  enabled: boolean;
  presetId: string;
  customPrompt: string;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeDocId(rawId: string, prefix = 'doc'): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function stripUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object' && Object.getPrototypeOf(input) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return input;
}

const inFlightProfilePromises = new Map<string, Promise<{ seeded: boolean }>>();
const inFlightSeedPromises = new Map<string, Promise<void>>();

/**
 * Ensure the user's root profile document `/users/{uid}` exists before any subcollection writes.
 * Deduplicated per userId to prevent React StrictMode / concurrent auth listener races.
 */
export async function ensureUserProfile(user: User): Promise<{ seeded: boolean }> {
  const existingPromise = inFlightProfilePromises.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const userPath = `users/${user.uid}`;
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      const email = clampStr(user.email, 256, '');
      const displayName = clampStr(user.displayName, 128, email.split('@')[0] || 'User');
      const photoURL = clampStr(user.photoURL, 1024, '');

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          displayName,
          photoURL,
          seeded: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { seeded: false };
      }

      const existingData = snap.data();
      await updateDoc(userRef, {
        email,
        displayName,
        photoURL,
        seeded: Boolean(existingData?.seeded),
        updatedAt: serverTimestamp(),
      });
      return { seeded: Boolean(existingData?.seeded) };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  })();

  inFlightProfilePromises.set(user.uid, run);
  try {
    return await run;
  } finally {
    inFlightProfilePromises.delete(user.uid);
  }
}

function buildPromptDocFields(userId: string, prompt: PromptItem, safeId: string) {
  const nowIso = new Date().toISOString();
  const safeTags = Array.isArray(prompt.tags)
    ? prompt.tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.slice(0, 60))
        .slice(0, 20)
    : [];
  const safeVersions = Array.isArray(prompt.versions)
    ? prompt.versions.slice(0, 30).map((v) => stripUndefinedDeep(v))
    : [];

  return {
    id: safeId,
    ownerId: userId,
    title: clampStr(prompt.title?.trim() || 'Untitled Prompt', 300, 'Untitled Prompt'),
    category: clampStr(prompt.category, 100, 'General'),
    subCategory: clampStr(prompt.subCategory, 100, ''),
    aiModel: clampStr(prompt.aiModel, 120, 'Gemini 4 Hydrogen'),
    language: clampStr(prompt.language, 60, 'Indonesian'),
    programmingLanguage: clampStr(prompt.programmingLanguage, 120, ''),
    framework: clampStr(prompt.framework, 120, ''),
    database: clampStr(prompt.database, 120, ''),
    platform: clampStr(prompt.platform, 160, ''),
    stylePrompt: clampStr(prompt.stylePrompt, 160, ''),
    designTheme: clampStr(prompt.designTheme, 160, ''),
    tone: clampStr(prompt.tone, 120, ''),
    outputLanguage: clampStr(prompt.outputLanguage, 60, 'Indonesian'),
    creativity: clampStr(prompt.creativity, 80, ''),
    length: clampStr(prompt.length, 120, ''),
    targetAudience: clampStr(prompt.targetAudience, 240, ''),
    description: clampStr(prompt.description, 4000, ''),
    additionalReqs: clampStr(prompt.additionalReqs, 4000, ''),
    negativePrompt: clampStr(prompt.negativePrompt, 2000, ''),
    expectedOutput: clampStr(prompt.expectedOutput, 3000, ''),
    reference: clampStr(prompt.reference, 4000, ''),
    content: clampStr(prompt.content?.trim() || 'Empty prompt', 120000, 'Empty prompt'),
    isFavorite: Boolean(prompt.isFavorite),
    isPinned: Boolean(prompt.isPinned),
    collectionId: prompt.collectionId ? sanitizeDocId(prompt.collectionId, 'col') : null,
    tags: safeTags,
    score: typeof prompt.score === 'number' ? prompt.score : null,
    scoreDetail: prompt.scoreDetail ? stripUndefinedDeep(prompt.scoreDetail) : null,
    qualityControl: prompt.qualityControl ? stripUndefinedDeep(prompt.qualityControl) : null,
    versions: safeVersions,
    createdAt: clampStr(prompt.createdAt || nowIso, 64, nowIso),
    updatedAt: clampStr(prompt.updatedAt || nowIso, 64, nowIso),
  };
}

async function createDocIfMissing(
  docPath: string,
  docRef: ReturnType<typeof doc>,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, data);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * Initialize a brand-new user's private Firebase workspace cleanly (settings only).
 * Prompts, collections, history, and media start completely empty.
 */
export async function seedUserWorkspaceIfEmpty(userId: string): Promise<void> {
  const existingPromise = inFlightSeedPromises.get(userId);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const userPath = `users/${userId}`;
    const userRef = doc(db, 'users', userId);

    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }

    if (!userSnap.exists() || userSnap.data()?.seeded === true) {
      return;
    }

    await createDocIfMissing(
      `users/${userId}/workspace/settings`,
      doc(db, 'users', userId, 'workspace', 'settings'),
      {
        docType: 'settings',
        ownerId: userId,
        payload: stripUndefinedDeep({
          ...DEFAULT_SETTINGS,
          defaultModel: 'gemini-4-hydrogen',
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    try {
      await updateDoc(userRef, {
        seeded: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  })();

  inFlightSeedPromises.set(userId, run);
  try {
    return await run;
  } finally {
    inFlightSeedPromises.delete(userId);
  }
}

async function deleteDocIfPresent(
  docPath: string,
  docRef: ReturnType<typeof doc>
): Promise<void> {
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

const purgedUsers = new Set<string>();

/**
 * Remove legacy auto-seeded sample prompts, collections, and history entries
 * from existing user workspaces so the library starts clean while keeping templates intact.
 */
export async function purgeLegacySeededSamples(userId: string): Promise<void> {
  if (purgedUsers.has(userId)) {
    return;
  }
  purgedUsers.add(userId);

  try {
    await Promise.all([
      ...LEGACY_SEEDED_IDS.prompts.map((id) =>
        deleteDocIfPresent(
          `users/${userId}/prompts/${id}`,
          doc(db, 'users', userId, 'prompts', id)
        )
      ),
      ...LEGACY_SEEDED_IDS.collections.map((id) =>
        deleteDocIfPresent(
          `users/${userId}/collections/${id}`,
          doc(db, 'users', userId, 'collections', id)
        )
      ),
      ...LEGACY_SEEDED_IDS.history.map((id) =>
        deleteDocIfPresent(
          `users/${userId}/history/${id}`,
          doc(db, 'users', userId, 'history', id)
        )
      ),
    ]);
  } catch (err) {
    purgedUsers.delete(userId);
    console.warn('Legacy sample cleanup skipped:', err);
  }
}

/**
 * Create or update a prompt in `/users/{userId}/prompts/{promptId}`.
 */
export async function syncPromptToFirestore(userId: string, prompt: PromptItem): Promise<void> {
  const safeId = sanitizeDocId(prompt.id, 'prompt');
  const path = `users/${userId}/prompts/${safeId}`;
  try {
    const ref = doc(db, 'users', userId, 'prompts', safeId);
    const snap = await getDoc(ref);
    const fields = buildPromptDocFields(userId, prompt, safeId);

    if (!snap.exists()) {
      await setDoc(ref, {
        ...fields,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } else {
      const { id: _id, ownerId: _ownerId, createdAt: _createdAt, ...mutableFields } = fields;
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function togglePromptFavoriteInFirestore(
  userId: string,
  promptId: string,
  nextFavorite: boolean
): Promise<void> {
  const safeId = sanitizeDocId(promptId, 'prompt');
  const path = `users/${userId}/prompts/${safeId}`;
  try {
    const ref = doc(db, 'users', userId, 'prompts', safeId);
    await updateDoc(ref, {
      isFavorite: nextFavorite,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePromptFromFirestore(userId: string, id: string): Promise<void> {
  const safeId = sanitizeDocId(id, 'prompt');
  const path = `users/${userId}/prompts/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'prompts', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchDeletePromptsFromFirestore(
  userId: string,
  promptIds: string[]
): Promise<void> {
  if (!promptIds.length) return;
  const path = `users/${userId}/prompts`;
  try {
    const refs = promptIds.map((id) => doc(db, 'users', userId, 'prompts', sanitizeDocId(id, 'prompt')));
    await deleteDocsChunked(refs, 5);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchMovePromptsToCollectionInFirestore(
  userId: string,
  promptIds: string[],
  collectionId: string | null
): Promise<void> {
  if (!promptIds.length) return;
  const path = `users/${userId}/prompts`;
  const safeCollectionId = collectionId ? sanitizeDocId(collectionId, 'col') : null;
  const nowIso = new Date().toISOString();
  try {
    const chunkSize = 5;
    for (let i = 0; i < promptIds.length; i += chunkSize) {
      const chunk = promptIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const ref = doc(db, 'users', userId, 'prompts', sanitizeDocId(id, 'prompt'));
        batch.update(ref, {
          collectionId: safeCollectionId,
          updatedAt: nowIso,
          serverUpdatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncCollectionToFirestore(userId: string, col: Collection): Promise<void> {
  const safeId = sanitizeDocId(col.id, 'col');
  const path = `users/${userId}/collections/${safeId}`;
  try {
    const ref = doc(db, 'users', userId, 'collections', safeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: safeId,
        ownerId: userId,
        name: clampStr(col.name?.trim() || 'Untitled Collection', 120, 'Untitled Collection'),
        description: clampStr(col.description, 500, ''),
        color: clampStr(col.color, 64, '#10B981'),
        iconName: clampStr(col.iconName, 64, 'Folder'),
        createdAt: clampStr(col.createdAt || new Date().toISOString(), 64, new Date().toISOString()),
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: clampStr(col.name?.trim() || 'Untitled Collection', 120, 'Untitled Collection'),
        description: clampStr(col.description, 500, ''),
        color: clampStr(col.color, 64, '#10B981'),
        iconName: clampStr(col.iconName, 64, 'Folder'),
        serverUpdatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCollectionFromFirestore(userId: string, id: string): Promise<void> {
  const safeId = sanitizeDocId(id, 'col');
  const path = `users/${userId}/collections/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'collections', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addHistoryEntryToFirestore(
  userId: string,
  promptTitle: string,
  action: HistoryLog['action'],
  details: string,
  promptId?: string
): Promise<HistoryLog> {
  const safeId = sanitizeDocId(`hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 'hist');
  const nowIso = new Date().toISOString();
  const entry: HistoryLog = {
    id: safeId,
    promptId: promptId ? sanitizeDocId(promptId, 'prompt') : undefined,
    promptTitle: clampStr(promptTitle, 300, ''),
    action,
    timestamp: nowIso,
    details: clampStr(details, 1000, ''),
  };
  const path = `users/${userId}/history/${safeId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'history', safeId), {
      id: safeId,
      ownerId: userId,
      promptId: entry.promptId ?? null,
      promptTitle: entry.promptTitle,
      action: entry.action,
      timestamp: entry.timestamp,
      details: entry.details,
      serverCreatedAt: serverTimestamp(),
    });
    return entry;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Save a user workspace state document (`settings`, `generator_draft`, `prd_draft`, `chat_preferences`).
 */
export async function saveWorkspaceDoc<T extends Record<string, any>>(
  userId: string,
  docId: WorkspaceDocId,
  payload: T
): Promise<void> {
  const path = `users/${userId}/workspace/${docId}`;
  try {
    const ref = doc(db, 'users', userId, 'workspace', docId);
    const snap = await getDoc(ref);
    const cleanPayload = stripUndefinedDeep(payload);

    if (!snap.exists()) {
      await setDoc(ref, {
        docType: docId,
        ownerId: userId,
        payload: cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        payload: cleanPayload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWorkspaceDoc(
  userId: string,
  docId: Exclude<WorkspaceDocId, 'settings'>
): Promise<void> {
  const path = `users/${userId}/workspace/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'workspace', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToWorkspaceDocRealtime<T>(
  userId: string,
  docId: WorkspaceDocId,
  callback: (payload: T | null) => void
) {
  const path = `users/${userId}/workspace/${docId}`;
  const docRef = doc(db, 'users', userId, 'workspace', docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback((data?.payload as T) ?? null);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncSettingsToFirestore(userId: string, settings: UserSettings): Promise<void> {
  await saveWorkspaceDoc(userId, 'settings', settings as Record<string, any>);
}

export function subscribeToSettingsRealtime(
  userId: string,
  callback: (settings: UserSettings) => void
) {
  return subscribeToWorkspaceDocRealtime<UserSettings>(userId, 'settings', (payload) => {
    if (payload) {
      callback({ ...DEFAULT_SETTINGS, ...payload });
    }
  });
}

export function subscribeToPromptsRealtime(
  userId: string,
  callback: (prompts: PromptItem[]) => void
) {
  const path = `users/${userId}/prompts`;
  const q = query(collection(db, 'users', userId, 'prompts'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PromptItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as PromptItem);
      });
      items.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToCollectionsRealtime(
  userId: string,
  callback: (collections: Collection[]) => void
) {
  const path = `users/${userId}/collections`;
  const q = query(collection(db, 'users', userId, 'collections'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Collection[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Collection);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToHistoryRealtime(
  userId: string,
  callback: (history: HistoryLog[]) => void
) {
  const path = `users/${userId}/history`;
  const q = query(collection(db, 'users', userId, 'history'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: HistoryLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as HistoryLog);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

async function deleteDocsChunked(refs: Array<ReturnType<typeof doc>>, chunkSize = 5): Promise<void> {
  for (let i = 0; i < refs.length; i += chunkSize) {
    const chunk = refs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export async function clearAllPromptsInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/prompts`;
  try {
    const q = query(collection(db, 'users', userId, 'prompts'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    await deleteDocsChunked(snapshot.docs.map((d) => d.ref));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllCollectionsInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/collections`;
  try {
    const q = query(collection(db, 'users', userId, 'collections'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    await deleteDocsChunked(snapshot.docs.map((d) => d.ref));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllHistoryInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/history`;
  try {
    const q = query(collection(db, 'users', userId, 'history'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    await deleteDocsChunked(snapshot.docs.map((d) => d.ref));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllMediaInFirestore(userId: string): Promise<void> {
  const path = `users/${userId}/media`;
  try {
    const q = query(collection(db, 'users', userId, 'media'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    await deleteDocsChunked(snapshot.docs.map((d) => d.ref));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Empty all user-saved collections, prompts, history, media assets, and drafts
 * while preserving user settings and built-in templates.
 */
export async function clearAllWorkspaceDataInFirestore(userId: string): Promise<void> {
  await Promise.all([
    clearAllPromptsInFirestore(userId),
    clearAllCollectionsInFirestore(userId),
    clearAllHistoryInFirestore(userId),
    clearAllMediaInFirestore(userId),
    deleteDocIfPresent(
      `users/${userId}/workspace/generator_draft`,
      doc(db, 'users', userId, 'workspace', 'generator_draft')
    ),
    deleteDocIfPresent(
      `users/${userId}/workspace/prd_draft`,
      doc(db, 'users', userId, 'workspace', 'prd_draft')
    ),
    deleteDocIfPresent(
      `users/${userId}/workspace/chat_preferences`,
      doc(db, 'users', userId, 'workspace', 'chat_preferences')
    ),
  ]);
}

// --- Media Studio Firestore Persistence ---

export async function syncImageAssetToFirestore(
  userId: string,
  img: GeneratedImageItem
): Promise<void> {
  const safeId = sanitizeDocId(img.id, 'img');
  const path = `users/${userId}/media/${safeId}`;
  // Guard against Firestore's 1MB document limit for large base64 data URLs
  const safeUrl = img.imageUrl && img.imageUrl.length <= 580000 ? img.imageUrl : '';
  try {
    const ref = doc(db, 'users', userId, 'media', safeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: safeId,
        ownerId: userId,
        mediaType: 'image',
        prompt: clampStr(img.prompt, 4000, 'Image prompt'),
        enhancedPrompt: clampStr(img.enhancedPrompt, 6000, ''),
        negativePrompt: clampStr(img.negativePrompt, 2000, ''),
        aspectRatio: clampStr(img.aspectRatio, 16, '1:1'),
        stylePreset: clampStr(img.stylePreset, 120, 'Photorealistic'),
        mediaUrl: safeUrl,
        isFallback: Boolean(img.isFallback),
        fallbackReason: clampStr(img.fallbackReason, 500, ''),
        model: clampStr(img.model, 120, 'gemini-3.1-flash-lite-image'),
        createdAt: clampStr(img.createdAt || new Date().toISOString(), 64, new Date().toISOString()),
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        mediaUrl: safeUrl,
        isFallback: Boolean(img.isFallback),
        fallbackReason: clampStr(img.fallbackReason, 500, ''),
        serverUpdatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncVideoAssetToFirestore(
  userId: string,
  vid: GeneratedVideoItem
): Promise<void> {
  const safeId = sanitizeDocId(vid.id, 'vid');
  const path = `users/${userId}/media/${safeId}`;
  const safeVideoUrl = vid.videoUrl && vid.videoUrl.length <= 580000 ? vid.videoUrl : '';
  const safeThumbUrl = vid.thumbnailUrl && vid.thumbnailUrl.length <= 180000 ? vid.thumbnailUrl : '';
  try {
    const ref = doc(db, 'users', userId, 'media', safeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: safeId,
        ownerId: userId,
        mediaType: 'video',
        prompt: clampStr(vid.prompt, 4000, 'Video prompt'),
        enhancedPrompt: clampStr(vid.enhancedPrompt, 6000, ''),
        cameraMovement: clampStr(vid.cameraMovement, 200, ''),
        lightingStyle: clampStr(vid.lightingStyle, 200, ''),
        aspectRatio: clampStr(vid.aspectRatio, 16, '16:9'),
        resolution: clampStr(vid.resolution, 16, '720p'),
        mediaUrl: safeVideoUrl,
        thumbnailUrl: safeThumbUrl,
        operationName: clampStr(vid.operationName, 300, ''),
        status: clampStr(vid.status, 32, 'processing'),
        progress: typeof vid.progress === 'number' ? vid.progress : 0,
        statusMessage: clampStr(vid.statusMessage, 500, ''),
        model: clampStr(vid.model, 120, 'gemini-omni-1.2-flash'),
        createdAt: clampStr(vid.createdAt || new Date().toISOString(), 64, new Date().toISOString()),
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        mediaUrl: safeVideoUrl,
        thumbnailUrl: safeThumbUrl,
        status: clampStr(vid.status, 32, 'processing'),
        progress: typeof vid.progress === 'number' ? vid.progress : 0,
        statusMessage: clampStr(vid.statusMessage, 500, ''),
        serverUpdatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMediaAssetFromFirestore(userId: string, id: string): Promise<void> {
  const safeId = sanitizeDocId(id, 'media');
  const path = `users/${userId}/media/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'media', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToMediaAssetsRealtime(
  userId: string,
  callback: (data: { images: GeneratedImageItem[]; videos: GeneratedVideoItem[] }) => void
) {
  const path = `users/${userId}/media`;
  const q = query(collection(db, 'users', userId, 'media'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const images: GeneratedImageItem[] = [];
      const videos: GeneratedVideoItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.mediaType === 'image') {
          images.push({
            id: d.id,
            prompt: d.prompt || '',
            enhancedPrompt: d.enhancedPrompt || undefined,
            negativePrompt: d.negativePrompt || undefined,
            aspectRatio: d.aspectRatio || '1:1',
            stylePreset: d.stylePreset || 'Photorealistic',
            imageUrl: d.mediaUrl || '',
            createdAt: d.createdAt || new Date().toISOString(),
            model: d.model || '',
            isFallback: Boolean(d.isFallback),
            fallbackReason: d.fallbackReason || undefined,
          });
        } else if (d.mediaType === 'video') {
          videos.push({
            id: d.id,
            prompt: d.prompt || '',
            enhancedPrompt: d.enhancedPrompt || undefined,
            cameraMovement: d.cameraMovement || undefined,
            lightingStyle: d.lightingStyle || undefined,
            aspectRatio: d.aspectRatio || '16:9',
            resolution: d.resolution || '720p',
            videoUrl: d.mediaUrl || undefined,
            thumbnailUrl: d.thumbnailUrl || undefined,
            operationName: d.operationName || undefined,
            status: d.status || 'completed',
            progress: typeof d.progress === 'number' ? d.progress : 100,
            statusMessage: d.statusMessage || undefined,
            createdAt: d.createdAt || new Date().toISOString(),
            model: d.model || '',
          });
        }
      });
      images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback({ images, videos });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
