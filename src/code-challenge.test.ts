import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { mergeUserProfiles, sourceA, sourceB } from './code-challenge';
import type { UserProfile, UserRole } from './code-challenge';

const emailsOf = (users: UserProfile[]) => users.map(u => u.email);

// Type assertions are checked by `pnpm typecheck` (tsc), not by vitest at runtime.
describe('UserProfile — types', () => {
  it('requires email as a plain string', () => {
    expectTypeOf<UserProfile['email']>().toEqualTypeOf<string>();
    expectTypeOf<{ name: string }>().not.toExtend<UserProfile>();
  });

  it('makes every other field optional', () => {
    expectTypeOf<{ email: string }>().toExtend<UserProfile>();
    expectTypeOf<UserProfile['name']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<UserProfile['managerEmail']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<UserProfile['role']>().toEqualTypeOf<UserRole | undefined>();
  });

  it('accepts known and unknown roles', () => {
    expectTypeOf<'developer'>().toExtend<UserRole>();
    expectTypeOf<'manager'>().toExtend<UserRole>();
    expectTypeOf<'user'>().toExtend<UserRole>();
    expectTypeOf<'admin'>().toExtend<UserRole>();
  });

  it('returns UserProfile[] from mergeUserProfiles', () => {
    expectTypeOf(mergeUserProfiles).parameters.toEqualTypeOf<[UserProfile[], UserProfile[]]>();
    expectTypeOf(mergeUserProfiles).returns.toEqualTypeOf<UserProfile[]>();
  });
});

describe('sample data', () => {
  it('has the records the challenge describes', () => {
    expect(sourceA).toHaveLength(5);
    expect(sourceB).toHaveLength(4);
  });

  it('includes a casing duplicate, a dangling manager and a self-reference', () => {
    expect(sourceB.some(u => u.email === 'MARY@example.com')).toBe(true);
    expect(sourceA.find(u => u.name === 'Ivan')?.managerEmail).toBe('nonexistent@example.com');
    expect(sourceA.find(u => u.name === 'SelfRef')?.managerEmail).toBe('self@example.com');
  });
});

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

  it('does not validate email format', () => {
    const merged = mergeUserProfiles([{ email: 'not-an-email' }, { email: 'a b@x.com' }], []);
    expect(emailsOf(merged)).toEqual(['not-an-email', 'a b@x.com']);
  });

  it('does not apply Unicode normalization (NFC and NFD forms stay separate)', () => {
    const nfc = 'jos\u00e9@example.com';
    const nfd = 'jose\u0301@example.com';
    expect(mergeUserProfiles([{ email: nfc }], [{ email: nfd }])).toHaveLength(2);
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

  it('takes a conflicting managerEmail from b, normalized', () => {
    const [user] = mergeUserProfiles(
      [{ email: 'a@example.com', managerEmail: 'old@example.com' }],
      [{ email: 'a@example.com', managerEmail: ' New@Example.com' }]
    );
    expect(user.managerEmail).toBe('new@example.com');
  });

  it('lets b win even when a appears later in the output order', () => {
    const merged = mergeUserProfiles(
      [{ email: 'x@example.com' }, { email: 'a@example.com', name: 'From A' }],
      [{ email: 'a@example.com', name: 'From B' }]
    );
    expect(merged).toEqual([
      { email: 'x@example.com' },
      { email: 'a@example.com', name: 'From B' },
    ]);
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

  it('drops a non-string managerEmail without overriding a valid one', () => {
    const fromB = { email: 'a@example.com', managerEmail: 42 } as unknown as UserProfile;
    const [user] = mergeUserProfiles([{ email: 'a@example.com', managerEmail: 'm@example.com' }], [fromB]);
    expect(user.managerEmail).toBe('m@example.com');

    const onlyBad = { email: 'b@example.com', managerEmail: { email: 'm@example.com' } };
    const [other] = mergeUserProfiles([onlyBad as unknown as UserProfile], []);
    expect(other).toEqual({ email: 'b@example.com' });
  });

  it('keeps other string fields as given (no trimming or case changes)', () => {
    const [user] = mergeUserProfiles([{ email: 'a@example.com', name: '  Ann  ', role: 'Manager' }], []);
    expect(user).toEqual({ email: 'a@example.com', name: '  Ann  ', role: 'Manager' });
  });

  it('passes unknown roles through', () => {
    const [user] = mergeUserProfiles([], [{ email: 'a@example.com', role: 'admin' }]);
    expect(user.role).toBe('admin');
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

  it('ignores inherited properties', () => {
    const record = Object.assign(Object.create({ role: 'manager' }), { email: 'a@example.com' });
    const [user] = mergeUserProfiles([record], []);
    expect(user).toEqual({ email: 'a@example.com' });
    expect(user.role).toBeUndefined();
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

  it('keeps first-appearance order when invalid records are interleaved', () => {
    const a = [{ email: 'a@example.com' }, { name: 'No email' }, { email: 'b@example.com' }];
    const b = [{ email: '' }, { email: 'c@example.com' }, { email: 'A@example.com', name: 'Ann' }];
    const merged = mergeUserProfiles(a as UserProfile[], b);
    expect(emailsOf(merged)).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
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

  it('returns results that are independent of the inputs', () => {
    const a = [{ email: 'a@example.com', name: 'Ann' }];
    const [user] = mergeUserProfiles(a, []);
    user.name = 'Changed';
    expect(a[0].name).toBe('Ann');
    expect(mergeUserProfiles(a, [])[0].name).toBe('Ann');
  });

  it('copies shallowly: nested values in extra fields are shared with the input', () => {
    const tags = ['core'];
    const [user] = mergeUserProfiles([{ email: 'a@example.com', tags } as UserProfile], []);
    expect((user as UserProfile & { tags: string[] }).tags).toBe(tags);
  });

  it('is deterministic', () => {
    const first = mergeUserProfiles(sourceA, sourceB);
    expect(first.length).toBeGreaterThan(0);
    expect(mergeUserProfiles(sourceA, sourceB)).toEqual(first);
  });
});

describe('provided harness', () => {
  it('passes with no errors or warnings', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await import('./code-challenge.harness');
      const logged = log.mock.calls.flat().join('\n');
      expect(logged).toContain('✅ mergeUserProfiles passed (user count check).');
      expect(logged).toContain('✅ mergeUserProfiles passed (unique email count check).');
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
