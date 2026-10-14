# Code Challenge — Requirements

User data comes from two sources (`sourceA`, `sourceB`). Each returns an array of user objects. Some users appear in both sources, possibly with inconsistent or partial fields.

Scope: **Step 1** and **Step 2**. Steps 3–4 (`linkManagers`, `countReports`) appear only as commented-out tests. They are listed at the end for context.

## Files / Module Contract

- Implementation file: `code-challenge.ts` (the test imports `./code-challenge`).
- Required exports:
  - `export interface UserProfile` (type-only import: `import type { UserProfile }`)
  - `export const sourceA: UserProfile[]`
  - `export const sourceB: UserProfile[]`
  - `export function mergeUserProfiles(a: UserProfile[], b: UserProfile[]): UserProfile[]`
- The provided harness (`src/code-challenge.harness.ts`, run with `pnpm challenge`) imports these and runs `testMerge()` in an IIFE when loaded. The vitest suite is `src/code-challenge.test.ts` (`pnpm test`).

---

## Step 1 — `UserProfile` interface & sample data

### R1.1 Define the interface from the data
Fields seen in the sample data:

| Field          | Present in                         | Notes                                                |
|----------------|------------------------------------|------------------------------------------------------|
| `email`        | every record                       | Identity key. Casing varies (`MARY@example.com`).    |
| `name`         | every record                       | Can differ between sources (`Mary` vs `Mary Clarke`).|
| `role`         | most records (missing on A/Mary)   | Values seen: `developer`, `user`, `manager`.         |
| `managerEmail` | some records                       | Can point to a missing user or to the user itself.  |

### R1.2 The sample data must type-check
`sourceA` and `sourceB` are typed `UserProfile[]` and must compile without changes. So:
- `role` must be **optional** (sourceA's Mary has no role).
- `managerEmail` must be **optional** (many records lack it).

### R1.3 The test harness's usage must type-check
- `merged.map(u => u.email.toLowerCase())` is called **without** optional chaining. Under `strict` mode `email` must therefore be typed `string` (required), or the test won't compile.
- `u.email?.toLowerCase()` is also used. That's harmless on a required field.
- `mary.name` and `mary.role` are compared to strings.

### R1.4 Explain assumptions and choices
The written explanation should cover:
- **Type of id:** there is no `id` field, so `email` is the natural key. Should it be required or optional? (The test usage in R1.3 pushes toward required.)
- **Missing fields:** which fields are optional, and why `?:` (absent) is preferred over `| null`.
- **`role` type:** plain `string`, or a union (`'developer' | 'manager' | 'user'`)? Tradeoff: type safety vs accepting unknown values from external sources.
- **`managerEmail`:** a plain string reference, not a nested object. It is not validated at this step (it can be dangling or self-referencing).
- **Future fields:** Step 3's commented tests use `user.manager.email`, so a later optional `manager?: UserProfile` field (or an extended type) is expected.

---

## Step 2 — `mergeUserProfiles(a, b)`

### Functional requirements
- **R2.1 Combine** both input arrays.
- **R2.2 Deduplicate by email.** Each email appears once in the output.
- **R2.3 Case-insensitive email matching.** `MARY@example.com` and `mary@example.com` are the same user.
- **R2.4 Merge fields** when a user is in both arrays.
- **R2.5 B wins on conflict.** If both records define a field, use B's value (e.g. name → `Mary Clarke`).
- **R2.6 Defined beats undefined.** If only one record defines a field, keep that value (e.g. role → `manager` from B; `managerEmail` → `tim@example.com` from A, since B/Mary has none).
- **R2.7 Return a new array of new objects.** Don't mutate the inputs or return their object references.
- **R2.8 Handle edge cases**, at least:
  - missing / empty / whitespace-only email
  - differences in case (and probably surrounding whitespace)

### Expected result for the sample data (from the tests)
- **Exactly 8** users: `alex, mary, sue, ivan, self, john, tim, bob`.
- **8 unique** lowercase emails.
- Mary's merged record:
  - `email === 'mary@example.com'` (**lowercase/normalized**, not B's `MARY@...`, even though B wins on other fields)
  - `name === 'Mary Clarke'`
  - `role === 'manager'`
  - and, by R2.6, `managerEmail === 'tim@example.com'`

### Implied / derived requirements
- **R2.9 Normalize emails in the output** (trim + lowercase). The Mary check requires `mary@example.com` even though B, the winning source, has `MARY@example.com`.
- **R2.10 Normalize `managerEmail`** the same way. Step 3 will look up managers by email, so normalized references avoid mismatches later.
- **R2.11 "Defined" means `!== undefined`.** Decide how `null` and `''` count. Suggestion: treat `undefined` (and maybe `null`/empty string) as "not defined" so a blank B value doesn't erase a real A value. Document the choice.
- **R2.12 Records without a usable email** can't be deduplicated. Pick a policy (skip, or keep as-is) and document it. Skipping is the safest choice, since the test calls `u.email.toLowerCase()` on every result.
- **R2.13 Duplicates within one source** (same email twice in A) should merge too, with later entries taking precedence. Same rule as A→B.
- **R2.14 Stable output order:** order of first appearance (A's order, then new users from B). Not tested, but deterministic output is nice.
- **R2.15 Don't validate manager references here.** Dangling (`ivan` → `nonexistent@`) and self-references (`self` → `self@`) stay unchanged in Step 2. They are Step 3's job.
- **R2.16 Generic field merging.** Ideally merge all keys, not a hard-coded list, so new fields work without code changes.

### Test harness behavior to keep in mind
- An empty result prints `Step 2: not implemented` and stops, so the stub `return []` "passes silently".
- The count and unique-count checks log ❌ on failure. The Mary checks log ⚠️ warnings.
- The test only logs and never throws. Success means seeing the ✅ lines and no ⚠️/❌ lines.

---

## Out of scope for now (future steps, from commented-out tests)

### Step 3 — `linkManagers(merged)` (not required yet)
- Resolve `managerEmail` to a `manager` object on each user.
- `alex → mary`, `bob → alex`.
- Dangling reference (`ivan → nonexistent@`) → `manager` undefined.
- Self-reference (`self → self@`) → `manager` undefined. A user must never manage themselves.

### Step 4 — `countReports(linked)` (not required yet)
- Returns `Record<email, { direct: number; indirect: number }>`.
- Expected: `tim {1, 3}`, `mary {2, 1}`, `alex {1, 0}`.
- Needs cycle-safe traversal.

---

## Decisions (previously open questions)
1. `role` is a string-literal union of the known values (`developer`, `manager`, `user`) plus any string. That keeps autocomplete while still accepting unknown roles. The tradeoff is that typos like `'manger'` still compile.
2. `undefined`, `null` and blank/whitespace-only strings all count as "not defined" and never override a value. `0` and `false` count as defined. As a result, b can't deliberately clear a field.
3. Records without a usable email are skipped silently. A missing (`null`/`undefined`) input array is treated as empty.
4. `email` and `managerEmail` are both normalized with trim + lowercase. There's no Unicode normalization. Other fields are kept as given.
5. Tooling: tests run with vitest, and the harness runs with tsx. `tsconfig` stays `strict`, but module resolution changed from `NodeNext` to `Bundler`, because the provided harness imports `./code-challenge` without an extension. As a result, `pnpm build` output isn't runnable under plain Node.
6. Copies are shallow: each output user is a new object, but nested values in extra fields are shared with the input. An own `__proto__` key in the input is ignored.
