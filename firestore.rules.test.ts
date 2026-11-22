/**
 * Phase 0 TDD Specification for Firestore Security Rules ("Dirty Dozen" Verification Matrix)
 * Intended to be executed against the Firebase Emulator Suite (`@firebase/rules-unit-testing`).
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read on user prompts',
    actorUid: null,
    emailVerified: false,
    operation: 'get',
    path: 'users/user_a/prompts/prompt_1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email creating prompt',
    actorUid: 'user_a',
    emailVerified: false,
    operation: 'create',
    path: 'users/user_a/prompts/prompt_1',
    payload: { id: 'prompt_1', ownerId: 'user_a', title: 'Test', content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user PII profile read',
    actorUid: 'user_b',
    emailVerified: true,
    operation: 'get',
    path: 'users/user_a',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-user subcollection list scraping',
    actorUid: 'user_b',
    emailVerified: true,
    operation: 'list',
    path: 'users/user_a/prompts',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity spoofing via mismatched ownerId',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a/prompts/prompt_1',
    payload: { id: 'prompt_1', ownerId: 'user_b', title: 'Spoof', content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow field injection (isAdmin)',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a',
    payload: { uid: 'user_a', email: 'a@example.com', displayName: 'A', photoURL: '', seeded: false, isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable ownerId modification on update',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'update',
    path: 'users/user_a/collections/col_1',
    payload: { ownerId: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client timestamp forgery on serverCreatedAt',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a/history/hist_1',
    payload: { id: 'hist_1', ownerId: 'user_a', action: 'create', serverCreatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path variable ID poisoning with invalid chars',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a/prompts/invalid$id!script',
    payload: { id: 'invalid$id!script', ownerId: 'user_a', title: 'Bad ID', content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet oversized title & tag array',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a/prompts/prompt_big',
    payload: { id: 'prompt_big', ownerId: 'user_a', title: 'x'.repeat(500), tags: Array(25).fill('t'), content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized workspace document ID',
    actorUid: 'user_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/user_a/workspace/arbitrary_key',
    payload: { docType: 'arbitrary_key', ownerId: 'user_a', payload: {} },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned write without parent user profile',
    actorUid: 'orphan_user',
    emailVerified: true,
    operation: 'create',
    path: 'users/orphan_user/prompts/prompt_orphan',
    payload: { id: 'prompt_orphan', ownerId: 'orphan_user', title: 'Orphan', content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
];
