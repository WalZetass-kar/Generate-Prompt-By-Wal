# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Tenant Ownership**: Every document under `/users/{userId}` and its subcollections (`prompts`, `collections`, `history`, `workspace`, `media`) belongs exclusively to `userId` and is readable/writable ONLY by `request.auth.uid == userId` with a verified Google email (`request.auth.token.email_verified == true`).
2. **Master Gate**: Every subcollection write verifies that the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Immutable Ownership & Creation Timestamps**: `ownerId`, `id`, `uid`, `createdAt`, and `serverCreatedAt` cannot be modified after creation.
4. **Server-Enforced Temporal Integrity**: `serverCreatedAt == request.time` on create; `serverUpdatedAt == request.time` (or `updatedAt == request.time`) on create and update.
5. **Bounded Sizes & Arrays**: All strings enforce `.size()` bounds; `tags.size() <= 20`, `versions.size() <= 30`; document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars).
6. **Zero Blanket Reads / Zero Shadow Fields**: Global catch-all default deny `allow read, write: if false;` at top. All creates use `hasAll` + `hasOnly`; all updates use `affectedKeys().hasOnly(...)` wrapped by `isValid[Entity]()`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/users/u1/prompts/p1` with `auth = null`.
2. **Unverified Email Write**: Write `/users/u1/prompts/p1` with `email_verified: false`.
3. **Cross-User PII Read**: User `u2` attempts `get` on `/users/u1`.
4. **Cross-User Subcollection List**: User `u2` attempts `list` on `/users/u1/prompts`.
5. **OwnerId Spoofing on Create**: User `u1` writes `/users/u1/prompts/p1` with `ownerId: "u2"`.
6. **Shadow Field Injection**: User `u1` writes `/users/u1/prompts/p1` with extra field `isAdmin: true`.
7. **Immutable Field Tampering**: User `u1` updates `/users/u1/prompts/p1` changing `ownerId` or `serverCreatedAt`.
8. **Client Timestamp Forgery**: User `u1` creates `/users/u1/collections/c1` with arbitrary `serverCreatedAt` != `request.time`.
9. **ID Poisoning**: User `u1` creates `/users/u1/prompts/invalid$id!123` or 200-char ID.
10. **Oversized Array / Denial-of-Wallet**: User `u1` creates prompt with 25 tags or `title` > 300 chars.
11. **Invalid Workspace Doc Type**: User `u1` creates `/users/u1/workspace/evil_doc` outside `['settings', 'generator_draft', 'prd_draft', 'chat_preferences']`.
12. **Orphaned Subcollection Write**: User `u1` creates `/users/u1/prompts/p1` when parent `/users/u1` does not exist.
