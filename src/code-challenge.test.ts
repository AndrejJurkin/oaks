import { describe, expect, it } from 'vitest';
import { mergeUserProfiles, sourceA, sourceB } from './code-challenge';
import type { UserProfile } from './code-challenge';

const emailsOf = (users: UserProfile[]) => users.map(u => u.email);

describe('mergeUserProfiles — sample data', () => {
  const merged = mergeUserProfiles(sourceA, sourceB);

  it('returns the 8 unique users in order of first appearance', () => {
    expect(emailsOf(merged)).toEqual([
      'alex@example.com',
      'mary@example.com',
      'sue@example.com',
      'ivan@example.com',
      'self@example.com',
      'john@example.com',
      'tim@example.com',
      'bob@example.com',
    ]);
  });

  it('has no duplicate emails (case-insensitive)', () => {
    expect(merged).toHaveLength(8);
    const unique = new Set(merged.map(u => u.email.toLowerCase()));
    expect(unique.size).toBe(merged.length);
  });

  it('merges Mary from both sources: B wins conflicts, defined values are kept, email is normalized', () => {
    const mary = merged.find(u => u.email === 'mary@example.com');
    expect(mary).toEqual({
      email: 'mary@example.com',
      name: 'Mary Clarke',
      role: 'manager',
      managerEmail: 'tim@example.com',
    });
  });

  it('keeps users that appear in only one source unchanged', () => {
    expect(merged.find(u => u.email === 'alex@example.com')).toEqual(sourceA[0]);
    expect(merged.find(u => u.email === 'bob@example.com')).toEqual(sourceB[3]);
  });

  it('does not validate manager references (dangling and self references are kept)', () => {
    expect(merged.find(u => u.email === 'ivan@example.com')?.managerEmail).toBe(
      'nonexistent@example.com'
    );
    expect(merged.find(u => u.email === 'self@example.com')?.managerEmail).toBe(
      'self@example.com'
    );
  });
});

describe('mergeUserProfiles — deduplication & email normalization', () => {
  it('matches emails case-insensitively and ignoring surrounding whitespace', () => {
    const merged = mergeUserProfiles(
      [{ email: '  Ann@Example.COM ', name: 'Ann' }],
      [{ email: 'ann@example.com', role: 'developer' }]
    );
    expect(merged).toEqual([
      { email: 'ann@example.com', name: 'Ann', role: 'developer' },
    ]);
  });

  it('normalizes managerEmail the same way', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com', managerEmail: ' Boss@Example.com ' }],
      []
    );
    expect(user.managerEmail).toBe('boss@example.com');
  });

  it('merges duplicates within a single source, later records winning', () => {
    const merged = mergeUserProfiles(
      [
        { email: 'a@example.com', name: 'First', role: 'user' },
        { email: 'A@example.com', name: 'Second' },
      ],
      []
    );
    expect(merged).toEqual([
      { email: 'a@example.com', name: 'Second', role: 'user' },
    ]);
  });

  it('merges three or more records for the same email across both sources', () => {
    const merged = mergeUserProfiles(
      [
        { email: 'a@example.com', name: 'A1', role: 'user' },
        { email: 'A@EXAMPLE.COM', managerEmail: 'm@example.com' },
      ],
      [
        { email: 'a@example.com', name: 'B1' },
        { email: ' a@example.com ', role: 'manager' },
      ]
    );
    expect(merged).toEqual([
      { email: 'a@example.com', name: 'B1', role: 'manager', managerEmail: 'm@example.com' },
    ]);
  });
});

describe('mergeUserProfiles — field precedence', () => {
  it('takes conflicting values from b', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com', name: 'From A', role: 'user' }],
      [{ email: 'a@example.com', name: 'From B', role: 'manager' }]
    );
    expect(user).toEqual({ email: 'a@example.com', name: 'From B', role: 'manager' });
  });

  it('keeps a defined value from a when b lacks it (absent or explicitly undefined)', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com', name: 'Ann', role: 'developer', managerEmail: 'm@example.com' }],
      [{ email: 'a@example.com', name: undefined }]
    );
    expect(user).toEqual({
      email: 'a@example.com',
      name: 'Ann',
      role: 'developer',
      managerEmail: 'm@example.com',
    });
  });

  it('takes a defined value from b when a lacks it', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com' }],
      [{ email: 'a@example.com', role: 'manager' }]
    );
    expect(user).toEqual({ email: 'a@example.com', role: 'manager' });
  });

  it('does not let null or blank strings override a defined value', () => {
    const fromB = { email: 'a@example.com', name: '   ', role: null } as unknown as UserProfile;
    const [user] = mergeUserProfiles([{ email: 'a@example.com', name: 'Ann', role: 'user' }], [fromB]);
    expect(user).toEqual({ email: 'a@example.com', name: 'Ann', role: 'user' });
  });

  it('does not let a blank managerEmail from b override the one from a', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com', managerEmail: 'm@example.com' }],
      [{ email: 'a@example.com', managerEmail: '  ' }]
    );
    expect(user.managerEmail).toBe('m@example.com');
  });

  it('treats 0 and false as defined values', () => {
    const fromA = { email: 'a@example.com', active: true, score: 5, verified: false };
    const fromB = { email: 'a@example.com', active: false, score: 0 };
    const [user] = mergeUserProfiles([fromA], [fromB]);
    expect(user).toEqual({ email: 'a@example.com', active: false, score: 0, verified: false });
  });

  it('omits fields that are not defined in any source', () => {
    const fromA = { email: 'a@example.com', role: undefined, name: null } as unknown as UserProfile;
    const [user] = mergeUserProfiles(
      [fromA],
      [{ email: 'a@example.com', managerEmail: '' }]
    );
    expect(user).toEqual({ email: 'a@example.com' });
    expect(Object.keys(user)).toEqual(['email']);
  });

  it('merges fields beyond the known ones generically', () => {
    const fromA = { email: 'a@example.com', team: 'core' };
    const fromB = { email: 'a@example.com', location: 'Berlin' };
    const [user] = mergeUserProfiles([fromA], [fromB]);
    expect(user).toEqual({ email: 'a@example.com', team: 'core', location: 'Berlin' });
  });
});

describe('mergeUserProfiles — edge cases', () => {
  it('returns an empty array for empty inputs', () => {
    expect(mergeUserProfiles([], [])).toEqual([]);
  });

  it('skips records without a usable email', () => {
    const invalid = [
      { name: 'No email' },
      { email: '', name: 'Empty' },
      { email: '   ', name: 'Blank' },
      { email: 42, name: 'Not a string' },
      null,
      undefined,
    ] as unknown as UserProfile[];
    const merged = mergeUserProfiles(invalid, [{ email: 'ok@example.com', name: 'Ok' }]);
    expect(merged).toEqual([{ email: 'ok@example.com', name: 'Ok' }]);
  });

  it('treats a missing input array as empty', () => {
    const missing = null as unknown as UserProfile[];
    expect(mergeUserProfiles(missing, [{ email: 'b@example.com' }])).toEqual([
      { email: 'b@example.com' },
    ]);
    expect(mergeUserProfiles([{ email: 'a@example.com' }], missing)).toEqual([
      { email: 'a@example.com' },
    ]);
  });

  it('ignores a __proto__ key instead of replacing the prototype', () => {
    const fromB = JSON.parse('{"email":"a@example.com","__proto__":{"role":"admin"}}');
    const [user] = mergeUserProfiles([{ email: 'a@example.com', name: 'Ann' }], [fromB]);
    expect(Object.getPrototypeOf(user)).toBe(Object.prototype);
    expect(user.role).toBeUndefined();
    expect(user).toEqual({ email: 'a@example.com', name: 'Ann' });
  });
});

describe('mergeUserProfiles — immutability', () => {
  it('does not mutate the input arrays or their records', () => {
    const a = structuredClone(sourceA);
    const b = structuredClone(sourceB);
    expect(mergeUserProfiles(a, b).length).toBeGreaterThan(0);
    expect(a).toEqual(sourceA);
    expect(b).toEqual(sourceB);
  });

  it('returns a new array of new objects', () => {
    const merged = mergeUserProfiles(sourceA, sourceB);
    const inputs = new Set<unknown>([...sourceA, ...sourceB]);
    expect(merged.length).toBeGreaterThan(0);
    expect(merged).not.toBe(sourceA);
    expect(merged).not.toBe(sourceB);
    for (const user of merged) expect(inputs.has(user)).toBe(false);
  });

  it('returns copies that are equal to, but not the same as, single-source records', () => {
    const [alex] = mergeUserProfiles([sourceA[0]], []);
    expect(alex).toEqual(sourceA[0]);
    expect(alex).not.toBe(sourceA[0]);
  });

  it('is deterministic', () => {
    const first = mergeUserProfiles(sourceA, sourceB);
    expect(first.length).toBeGreaterThan(0);
    expect(mergeUserProfiles(sourceA, sourceB)).toEqual(first);
  });
});
