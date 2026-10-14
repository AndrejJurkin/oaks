/*****************************************************
You receive user data from two different sources (sourceA and sourceB).
Each source returns an array of user objects. Some users appear in both sources, potentially with inconsistent or partial fields.
You want implement Step 1 - Step 2.
 *****************************************************/

/*****************************************************
 * Step 1. USER INTERFACE & SAMPLE DATA

Based on the data below, define a TypeScript interface `UserProfile` that includes fields according to the data.
Explain any assumptions or choices you make (e.g., type of id, handling of missing fields, etc.).
 *****************************************************/

/*
 * Assumptions & choices:
 * - There is no separate id. `email` is the identity key, so it is required and typed `string`.
 *   It's compared case-insensitively and normalized (trimmed, lowercased) when merging.
 * - Every other field is optional (`?:`) because sources return partial records.
 *   Missing means absent/undefined rather than `null`. Incoming `null` is still tolerated at runtime.
 * - `role` lists the known values for autocomplete, but still accepts any string,
 *   because external sources may send roles we don't know about yet.
 * - `managerEmail` is a plain email reference. It isn't validated here, so it may point
 *   to a user that doesn't exist or to the user itself. Resolving it is a later step.
 */
export type UserRole = 'developer' | 'manager' | 'user' | (string & {});

export interface UserProfile {
  email: string;
  name?: string;
  role?: UserRole;
  managerEmail?: string;
}

export const sourceA: UserProfile[] = [
  {
    email: 'alex@example.com',
    name: 'Alex',
    role: 'developer',
    managerEmail: 'mary@example.com',
  },
  {
    email: 'mary@example.com',
    name: 'Mary',
    managerEmail: 'tim@example.com',
  },
  {
    email: 'sue@example.com',
    name: 'Sue',
    role: 'user',
  },
  {
    email: 'ivan@example.com',
    name: 'Ivan',
    role: 'developer',
    managerEmail: 'nonexistent@example.com',
  },
  {
    email: 'self@example.com',
    name: 'SelfRef',
    role: 'developer',
    managerEmail: 'self@example.com',
  },
];

export const sourceB: UserProfile[] = [
  {
    email: 'MARY@example.com',
    name: 'Mary Clarke',
    role: 'manager',
  },
  {
    email: 'john@example.com',
    name: 'John',
    role: 'developer',
    managerEmail: 'mary@example.com',
  },
  {
    email: 'tim@example.com',
    name: 'Tim',
    role: 'manager',
  },
  {
    email: 'bob@example.com',
    name: 'Bob',
    role: 'developer',
    managerEmail: 'alex@example.com',
  },
];

/*****************************************************
 * Step 2. MERGE & DEDUPLICATE

Write a function `mergeUserProfiles` that:
- Combines both arrays (a and b).
- Deduplicates users by their email.
- Merges fields if a user appears in both arrays
- Conflicting values from sourceB takes precedence over sourceA (e.g. if both records have name defined, take name from sourceB array)
- Defined values takes precedence over undefined (e.g., if one record has role defined and the other doesn’t, keep the defined value).
- Returns a new array of unique UserProfile objects.
- Handle potential edge cases (e.g., missing email, differences in case).
 *****************************************************/

/** Trimmed, lowercased email, or undefined if the value isn't a usable email string. */
function normalizeEmail(email: unknown): string | undefined {
  if (typeof email !== 'string') return undefined;
  return email.trim().toLowerCase() || undefined;
}

/** undefined, null and blank strings count as "not defined" and never override a value. */
function isDefined(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

/*
 * Records are applied in order (all of a, then all of b), so later records win conflicts,
 * including duplicates within one source. Records without a usable email can't be
 * deduplicated, so they are skipped. Output order is the order each email first appears.
 */
export function mergeUserProfiles(a: UserProfile[], b: UserProfile[]): UserProfile[] {
  const byEmail = new Map<string, UserProfile>();

  for (const record of [...a, ...b]) {
    const email = normalizeEmail(record?.email);
    if (!email) continue;

    const merged: Record<string, unknown> = { ...byEmail.get(email) };
    const normalized = { ...record, email, managerEmail: normalizeEmail(record.managerEmail) };
    for (const [key, value] of Object.entries(normalized)) {
      if (isDefined(value)) merged[key] = value;
    }

    byEmail.set(email, merged as unknown as UserProfile);
  }

  return [...byEmail.values()];
}
