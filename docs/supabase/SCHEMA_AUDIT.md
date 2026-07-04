# MyPayBoard — Schema Audit

> Read-only audit of `lib/types.ts`, `lib/useMyPayBoard.ts`, and related `lib/` files.
> No app code was modified to produce this document. Source: commit `27ed3a1` on `data_migration`.

---

## Step 1A — Type Definitions (`lib/types.ts`)

```
TYPE: User
FIELDS:
  id            string
  name          string
  role          UserRole ('admin' | 'member' | 'viewer')
  avatarColor   string (tailwind bg class, e.g. 'bg-navy-500')
  lastActive    string?  (optional, ISO timestamp — never set anywhere in code)
  email         string?  (optional)
  displayName   string?  (optional)
NOTES:
  - Only `updateUser()` in useMyPayBoard.ts ever writes to a User, and only
    name/email/displayName. `role`, `avatarColor`, `lastActive` are set at
    creation time only (creation path not found in current lib/ — likely
    onboarding UI not yet audited/built).
  - No `clerkId` field — but `User.id` IS the Clerk user id in practice
    (see session.ts: `syncFromClerk` writes `{ id: clerkUserId }`, and
    `useMyPayBoardStore.getCurrentUser` matches `data.currentUserId` against
    `User.id`). This is an implicit convention, not a typed guarantee.
```

```
TYPE: CategoryDefinition
FIELDS:
  id          string
  name        string
  scope       'expense' | 'income'
  isDefault   boolean
  order       number
  createdAt   string (ISO timestamp)
NOTES: Used for both expenseCategories[] and incomeCategories[] arrays (same shape, discriminated by `scope`).
```

```
TYPE: Creditor  (master-list expense/bill)
FIELDS:
  id                  string
  name                string
  category            ExpenseCategory (union of known strings | string — effectively free text)
  categoryId          string?          (optional — canonical FK to CategoryDefinition when present)
  defaultAmount       number
  dueDay              number | 'varies' | 'asap' | null
  dueDatePattern      string           (e.g. "*/30"; legacy/derived, kept for template helpers)
  notes               string
  address             string?
  phone               string?
  email               string?
  website             string?
  url                 string?
  accountLastFour     string?          (masked display only)
  accountLastFours    string[]?        (multiple masked identifiers)
  icon                string?          (key into lib/icons.ts ICON_MAP)
  trackDebt           boolean?
  debtDetail          object?          — see nested DebtDetail below
  muted               boolean          (required, but normalizeCreditor() always coerces via Boolean(), so effectively always present after load)
  archived            boolean          (required, same coercion as muted)
  archivedAt          string?
  owner               string?
  active              boolean
  tags                string[]
  createdAt           string
  updatedAt           string

NESTED: Creditor.debtDetail
  type                'revolving' | 'installment'
  balanceOwed         number
  minMonthlyPayment   number           (required in type; useMyPayBoard.normalizeCreditor backfills from defaultAmount if missing on load — so schema should treat as NOT NULL with app-level default)
  availableCredit     number?
  creditLimit         number?
  apr                 number?

NOTES:
  - `dueDay` is a tagged union (number | string-literal | null) — cannot map
    directly to a single SQL column type. Recommend splitting into
    `due_day int null` + `due_day_special text null check (due_day_special in ('varies','asap'))`,
    or a single `text` column with app-side parsing (see Step 2 discrepancies).
  - `category` (free text) vs `categoryId` (FK) is a live migration in progress
    — `migrateRecordCategoryIds()` in category-definitions.ts backfills
    `categoryId` from `category` string matching. Schema should make
    `category_id` the FK and treat `category` (legacy display string) as
    a denormalized/nullable holdover, not dropped yet since some code paths
    still read `String(creditor.category)` as a fallback.
  - Legacy field `debtDetail.promoEndDate` is explicitly stripped on load
    (`stripLegacyDebtDetailFields` in useMyPayBoard.ts) — confirms it existed
    in older stored data but is not in the current type. Do not include in schema.
```

```
TYPE: IncomeSource (aliased as `Income`)
FIELDS:
  id            string
  name          string
  group         string (union hints: 'jobs' | 'benefits' | 'business' | 'other' | string — effectively free text, same category/categoryId pattern as Creditor)
  categoryId    string?
  type          string?   ('Employment' | 'Benefit' | string)
  amount        number
  frequency     'weekly' | 'biweekly' | 'monthly' | '15th-30th' | 'yearly'
  owner         string    (user id, or 'shared' — see normalizeIncomeOwner)
  icon          string?
  muted         boolean
  archived      boolean
  archivedAt    string?
  active        boolean
NOTES:
  - `owner` has legacy values ('user-chris', 'user-nicole') migrated to
    lowercase ids by `normalizeIncomeOwner()` — confirms hardcoded legacy
    household member ids existed pre-Clerk. Not present in current type but
    worth flagging: `owner` is a soft reference to `User.id`, never enforced.
  - No `createdAt`/`updatedAt` on Income, unlike Creditor — inconsistent with
    Creditor's audit fields. Flag in Step 2.
```

```
TYPE: Bill (board snapshot, lives inside PayDateCard.bills[])
FIELDS:
  id                 string
  name               string
  nameOverride       string?
  amount             number
  dueDate            string
  category           ExpenseCategory?
  paid               boolean
  muted              boolean
  notes              string
  origin             'master' | 'oneoff'
  creditorId         string?   (provenance only, NOT a live FK/sync channel — see type comment)
  promotedToMaster   boolean?
  rowColor           string?   (hex; omit or #FFFFFF = default)
NOTES:
  - This is a **snapshot** row, explicitly documented as not live-linked to
    Creditor. Needs its own child table keyed to PayDateCard, with
    `creditor_id` as a nullable soft-reference (no enforced FK integrity
    required, but a real FK constraint is still fine since it's informational).
```

```
TYPE: Note
FIELDS:
  id           string
  authorId     string
  authorName   string
  text         string
  timestamp    string
NOTES:
  - `authorName` is denormalized (duplicates User.name at time of posting).
    stripRuntimeNoteFields() in useMyPayBoard.ts strips notes down to exactly
    these 5 fields before every save — confirms this is the full persisted shape.
  - Lives in two places: PayDateCard.notes[] AND MonthlyBoard.sharedNotes[] —
    same shape, different parent. Needs a `parent_type` or two child tables.
```

```
TYPE: LegacyTemplateBill / LegacyTemplateModule / LegacyTemplate
FIELDS: (see types.ts lines 148-170)
NOTES:
  - Explicitly labeled "Legacy board templates (seed / older board generation)".
    Not referenced anywhere in useMyPayBoard.ts's active code path (superseded
    by Template/TemplatePayDateCard/TemplateBill). EXCLUDE from schema —
    dead type, kept only for old seed-data compatibility that no longer exists
    since lib/mockData.ts was deleted.
```

```
TYPE: TemplateBill
FIELDS:
  id             string
  masterListId   string    (FK to Creditor.id; empty string '' when isOneOff — see NOTES)
  name           string
  nameOverride   string?
  amount         number
  dueDate        string
  category       string
  isOneOff       boolean?
NOTES:
  - `masterListId: string` is NOT optional in the type, but is semantically
    nullable — one-off bills use `''` as a sentinel instead of null/undefined.
    Schema should make `master_list_id uuid null` and treat empty string as
    the app's legacy "no value" convention (migration script must convert
    '' → NULL).
```

```
TYPE: TemplatePayDateCard
FIELDS:
  id                          string
  assignedUserId              string   (FK to User.id)
  incomeSourceId               string   (FK to IncomeSource.id)
  defaultPayAmount             number
  defaultPayDate               string   (e.g. "15" or "last" — not a real date)
  defaultPayDateMonthOffset    number?  (0 = same month as template base; undefined treated as 0)
  boardColumn                  BoardColumn? (1 | 2)
  headerColor                  string?  (hex)
  bills                        TemplateBill[]
NOTES: See existing project memory on defaultPayDateMonthOffset (cross-month template resolution).
```

```
TYPE: Template
FIELDS:
  id                 string
  name               string
  isDefault          boolean
  assignedUserIds    string[]   (FK array to User.id — needs join table)
  payDateCards       TemplatePayDateCard[]
  createdAt          string
  updatedAt          string
```

```
TYPE: PayDateCard
FIELDS:
  id                       string
  templatePayDateCardId    string?   (provenance — which template card this came from)
  owner                    string    (FK to User.id)
  source                   string    (income source display name, e.g. "Blackstone" — denormalized copy, not FK)
  payDate                  string    (ISO date, e.g. "2026-05-05")
  payAmount                number | null | undefined  (editable; missing = unknown)
  bills                    Bill[]
  notes                    Note[]
  isFromTemplate           boolean
  sortOrder                number
  boardColumn              BoardColumn? (1 | 2)
  headerColor              string?  (hex)
NOTES:
  - `source` is a plain string copied at creation time from the income name —
    NOT a live FK to Income, confirmed by board-from-template.ts
    (`incomeSourceLabel()` resolves the name once at board-build time).
  - Legacy field `templateModuleId` is migrated to `templatePayDateCardId` on
    load (`normalizePayDateCard()`), confirming a prior "Module" → "Pay Date
    Card" rename (matches recent commit history). Do not include legacy name.
```

```
TYPE: MonthlyBoard
FIELDS:
  id             string
  month          number  (1-12)
  year           number
  label          string  (e.g. "May 2026")
  templateId     string?
  payDateCards   PayDateCard[]
  status         'active' | 'preparing' | 'archived'
  sharedNotes    Note[]
  createdAt      string
  updatedAt      string
NOTES:
  - Legacy field `modules` migrated to `payDateCards` on load
    (`normalizeBoard()`) — same rename pattern as PayDateCard.
```

```
TYPE: MyPayBoardData (root persisted object)
FIELDS:
  users                User[]
  currentUserId        string   — RUNTIME ONLY, stripped before save (see PersistedMyPayBoardData / toPersistedData())
  creditors            Creditor[]
  expenseCategories    CategoryDefinition[]
  incomeCategories     CategoryDefinition[]
  incomes              Income[]
  boards               MonthlyBoard[]
  boardTemplates       Template[]
  appVersion           string
  workspaceName        string?  (optional — single shared name for the whole household record)
NOTES:
  - This is the entire shared household blob under one localStorage key
    (`mypayboard-data`). There is currently NO explicit "household" entity —
    the household boundary is implicit (whatever's in one browser's
    localStorage / to be shared across Clerk-authenticated users once
    Supabase multi-device sync ships). See Step 2 flag on `household_id`.
```

```
TYPE: AppUIState (not persisted — lib/types.ts declares it but grep shows no
  imports/usages anywhere else in the codebase)
FIELDS: selectedBoardId, selectedPayDateCardId, selectedCreditorId, sidebarOpen, theme
NOTES: Dead type — appears unused. EXCLUDE from schema entirely (no persistence, no runtime use found).
```

---

## Step 1B — localStorage Bucket Shapes (`lib/useMyPayBoard.ts`, `lib/userPrefs.ts`, `lib/session.ts`)

```
mypayboard-data  (household-wide, shared across users; PersistedMyPayBoardData)
  = MyPayBoardData minus currentUserId
  Written by: saveToStorage() -> toPersistedData()
    - also strips: updatedAt (stray top-level field from old data), templates (legacy alias)
    - boards are passed through stripRuntimeBoardFields() which rewrites every
      note in every card to exactly {id, authorId, authorName, text, timestamp}
      (defense against any transient/runtime note fields)

mypayboard-user  (per-browser session identity)
  = { id: string }   — Clerk user id, nothing else. See session.ts StoredSessionUser = Pick<User, 'id'>.

mypayboard-prefs-{userId}  (per-user UI prefs; lib/userPrefs.ts UserPrefs)
  theme                    'light' | 'dark' | null
  expenseView              'grouped' | 'list'
  incomeView               'grouped' | 'list'
  expenseGroupOpenState    Record<string, boolean>
  incomeGroupOpenState     Record<string, boolean>
  expenseDisplayPrefs      { accountNumber: boolean, dueDate: boolean, linkIcon: boolean }
  moduleHeaderColors       Record<string, string>   (keyed by moduleColorKey() = "{owner}:{templatePayDateCardId ?? id}")
  readNoteIds              string[]
  moduleSortState          Record<string, {key: 'name'|'amount'|'dueDate', direction: 'asc'|'desc'}>
  lastDashboardPath        string | null
NOTES:
  - This bucket is pure client display state — per Product Principle / CLAUDE.md
    architecture, this should almost certainly stay client-side (or a single
    jsonb blob per user) rather than being fully normalized into relational
    tables. Recommend one `user_prefs` table with a `prefs jsonb` column,
    keyed by (user_id, household_id) — normalizing moduleHeaderColors /
    expenseGroupOpenState / moduleSortState into their own tables would be
    premature relational modeling for pure UI state.
```

Legacy migration paths confirmed in code (all read-once-then-delete):
- `myPayBoard_templates` → merged into `boardTemplates` (LEGACY_TEMPLATES_STORAGE_KEY)
- `mypayboard-theme`, `mypayboard-expense-view-state`, `mypayboard-income-view-state`,
  `mypayboard-expense-group-open-state`, `mypayboard-income-group-open-state`,
  `mypayboard-display-prefs`, `mypayboard-last-dashboard-path` → merged into per-user prefs key

These legacy keys should NOT appear in the Supabase schema — they are pre-migration
localStorage artifacts with no analog once Supabase is the source of truth.

---

## Step 1C — Inline Types Outside `lib/`

Searched all `.tsx`/`.ts` under `components/` and `app/` for `interface `/`type ` declarations.

Result: **~90 matches, all are component prop types, sort-state types, or filter-enum
types scoped to a single component's UI behavior** (e.g. `DebtSortState`, `ExpenseListViewProps`,
`ArchiveTab`). None represent persisted data shapes that are missing from `lib/types.ts`,
with one exception worth naming explicitly:

```
components/archive/ExpensesArchiveTab.tsx:20
type ArchivedExpense = { creditor: Creditor, label: string, sortIndex: number }
```
This is a derived/computed view-model built at render time from `Creditor[]` — not
a distinct persisted shape. EXCLUDE from schema.

No other component defines a data type that duplicates or extends a `lib/types.ts` type.

---

## Step 1D — `lib/mockData.ts`

**File does not exist.** Confirmed via glob search and consistent with CLAUDE.md:
> "Seed data: `lib/mockData.ts` has been deleted (Phase 1 of launch cleanup)."

No seed data comparison is possible. `EMPTY_STATE` in `useMyPayBoard.ts` is the only
"shape example" left in the repo, and it's just empty arrays + `appVersion: '0.1.0'`.

---

## Step 2 — Discrepancies & Flags

1. **No `household` entity exists yet.** All current data is a single flat blob per
   browser (`mypayboard-data`). The task's schema rules require `household_id` on
   every table for RLS scoping — this is a **new concept being introduced by the
   migration**, not derived from existing code. `MyPayBoardData.workspaceName?`
   is the closest existing analog (a single optional display name for the shared
   record) and should probably become `households.name`.

2. **`User.id` is implicitly the Clerk user id**, never a typed/enforced relationship.
   `session.ts` writes `{ id: clerkUserId }` directly. Schema should make
   `users.clerk_id text unique not null` explicit, with `users.id` as the normal uuid PK.

3. **Naming drift `category` (free-text) vs `categoryId` (FK)** on both `Creditor`
   and `IncomeSource`/`Income`. This is a live, in-progress migration inside the
   app itself (`migrateRecordCategoryIds()`). Recommend the Supabase schema use
   `category_id uuid not null references category_definitions(id)` as canonical,
   and drop the free-text `category`/`group` column from the relational schema —
   the migration script (Session 3) can resolve any un-migrated legacy string via
   the same `resolveCreditorCategoryId` logic before insert.

4. **`Income.group`** field name doesn't match `Creditor.category` even though they
   serve the identical purpose (legacy pre-`categoryId` grouping key). Naming drift
   worth flagging but not fixing in schema — map both to `category_id`.

5. **`Creditor.dueDay: number | 'varies' | 'asap' | null`** is a mixed-type field
   that can't map to one SQL column type cleanly. See Step 1A note — split into
   `due_day int null` + `due_day_kind text null check (in ('varies','asap'))`,
   or keep a single nullable `text` column (`due_day text null`) and let app code
   keep doing the number/keyword parsing it already does via `dueDayFromPattern()`.
   Recommend the **text column** approach — simplest 1:1 mapping, least schema
   churn, matches how the app already treats it as a serialized value
   (`dueDatePattern` is already a derived string form of the same thing).

6. **`TemplateBill.masterListId: string` uses `''` as a null-sentinel** for one-off
   bills (`isOneOff: true`). Schema column should be nullable uuid; migration must
   convert `''` → `NULL`.

7. **`Creditor.debtDetail.minMonthlyPayment`** is typed as required (`number`) but
   `normalizeCreditor()` proves it's sometimes missing on load and gets backfilled
   from `defaultAmount`. Treat as `NOT NULL` in schema (post-migration-script
   backfill), matching the type's stated contract, not the raw legacy data.

8. **`Creditor.muted` / `Creditor.archived`** are typed `boolean` (required) but
   `normalizeCreditor()` coerces both via `Boolean(...)` on every load, implying
   legacy data sometimes stored `undefined`. Schema: `not null default false`.

9. **`Income` has no `createdAt`/`updatedAt`**, unlike `Creditor` which has both.
   Inconsistent audit trail. Recommend adding `created_at`/`updated_at` to the
   `incomes` table per the universal `created_at` rule even though the TS type
   doesn't have it yet (the DDL rules mandate `created_at` on every table anyway).

10. **`LegacyTemplateBill` / `LegacyTemplateModule` / `LegacyTemplate`** and
    **`AppUIState`** are dead types — no live read/write path found anywhere in
    `lib/` or component code. **Excluded entirely from the DDL.**

11. **`Note` is reused for two different parents** (`PayDateCard.notes[]` and
    `MonthlyBoard.sharedNotes[]`) with the identical shape. Schema uses one
    `notes` table with a nullable `pay_date_card_id` and nullable `board_id`,
    with a check constraint requiring exactly one to be set.

12. **`Bill.creditorId`** is documented in the type's own comment as
    "provenance only, NOT a sync channel" — i.e., intentionally soft. Schema
    still adds a real FK constraint (for integrity / cascade-on-delete
    behavior), but app logic must never treat it as a live join.

13. **No `any` types found** in the audited type definitions — `useMyPayBoard.ts`
    uses `unknown` + type guards throughout for storage parsing (safe pattern,
    nothing blocking schema accuracy).

14. **`PayDateCard.payAmount: number | null | undefined`** — both `null` and
    `undefined` mean "unknown/unset" with no distinct meaning between them.
    Schema: single nullable `numeric` column; migration collapses both to `NULL`.

15. **`TemplatePayDateCard.assignedUserId` / `incomeSourceId` are typed as
    required (`string`, not `string?`) but both can hold `''` as an "unset"
    sentinel at runtime**, the same pattern as `TemplateBill.masterListId`
    (audit #6). Confirmed in `lib/template-board-adapter.ts`:
    `createBlankPreviewPayDateCard()` sets `owner = template.assignedUserIds[0] ?? ''`
    when a template has no assigned users, and `resolveIncomeIdFromSource()`
    returns `partial?.id ?? incomes[0]?.id ?? ''` when no income matches or
    exists. **Fixed in SCHEMA_DDL.sql**: both columns are nullable FKs
    (`uuid references ...` without `not null`); migration must convert
    `''` → `NULL` for both, same as `master_list_id`.

16. **`User.avatarColor`'s own type comment is stale/wrong.** `lib/types.ts`
    documents it as `// tailwind bg class e.g. 'bg-navy-500'`, but every call
    site treats it as a literal CSS color value passed straight into an inline
    style — e.g. `style={{ backgroundColor: user.avatarColor }}` in
    `app/dashboard/_components/DashboardShell.tsx:90`,
    `app/dashboard/settings/page.tsx:88,266`, and
    `components/modules/NotesPanel.tsx:115`. A Tailwind class string like
    `'bg-navy-500'` is not a valid CSS `background-color` value, so for this
    to render correctly the stored value must already be a hex/CSS color
    (e.g. `#185FA5`), not a class name. **No creation/assignment site for
    `avatarColor` exists anywhere in the current codebase** — it's read-only
    in every file found, so the actual live value in any existing
    localStorage data could not be directly confirmed either way, only
    inferred from how it's consumed. Recommend `avatar_color text not null`
    in the schema and validating actual stored values during the Session 3
    migration script (reject/fix any value that isn't a valid hex color).
    No `lib/hooks/useUsers.ts` exists to check for a different assignment
    convention (see below).

17. **`lib/hooks/` does not exist.** There is no `useUsers` hook anywhere in
    the repo — user data is read via `useMyPayBoard()`'s `data.users` /
    `getCurrentUser()` directly, with per-field updates via `updateUser()`.
    If a dedicated `useUsers` hook is expected for the Supabase migration,
    it does not exist yet and will need to be created new, not adapted from
    an existing implementation.

18. **No `owner === "chris"` / `"user-chris"` string literals found in
    `components/`.** The only place those legacy literals appear is inside
    `lib/useMyPayBoard.ts`'s `normalizeIncomeOwner()` (a one-time migration
    shim with an explicit `// TODO: migrate legacy keys to workspace member
    IDs` comment), which strips them down to lowercase ids (`'chris'`,
    `'nicole'`) on load. Components only ever see the already-normalized
    value. Confirmed clean for component code; the legacy literals still
    live in that one normalizer function and should be dropped once the
    Supabase migration script does the same backfill once, server-side.
