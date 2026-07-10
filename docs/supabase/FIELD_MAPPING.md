# MyPayBoard — Field Mapping (TypeScript → Supabase)

> **Status:** Session 4 complete — household data now persists in Supabase; legacy `mypayboard-data` is migrated once via `scripts/migrate-localstorage.ts`. This document remains the canonical TypeScript ↔ Supabase column reference.
>
> Original migration map for Session 3 (swapping `useMyPayBoard` reads/writes to Supabase).
> Types excluded entirely: `LegacyTemplate`, `LegacyTemplateModule`, `LegacyTemplateBill`,
> `AppUIState` — no live read/write path found in the current codebase (see SCHEMA_AUDIT.md #10).

| TypeScript Type | Field Name | Supabase Table | Column Name | Type | Notes |
|---|---|---|---|---|---|
| MyPayBoardData | (n/a, root) | households | id | uuid | new concept — no TS equivalent, see audit #1 |
| MyPayBoardData | workspaceName | households | name | text | |
| MyPayBoardData | appVersion | households | app_version | text | |
| MyPayBoardData | currentUserId | — | — | — | runtime-only, never persisted (PersistedMyPayBoardData) |
| User | id | users | id | uuid | PK; Clerk id moves to `clerk_id` |
| User | id (session use) | users | clerk_id | text | see audit #2 — implicit convention made explicit |
| User | name | users | name | text | |
| User | role | users | role | text | check constraint |
| User | avatarColor | users | avatar_color | text | type comment says Tailwind class, all call sites use it as CSS color — see audit #16, verify actual stored values before migrating |
| User | lastActive | users | last_active | timestamptz | never set in current code |
| User | email | users | email | text | |
| User | displayName | users | display_name | text | |
| CategoryDefinition | id | category_definitions | id | uuid | |
| CategoryDefinition | name | category_definitions | name | text | |
| CategoryDefinition | scope | category_definitions | scope | text | check ('expense'\|'income') |
| CategoryDefinition | isDefault | category_definitions | is_default | boolean | |
| CategoryDefinition | order | category_definitions | order | integer | quoted `"order"` (reserved word) |
| CategoryDefinition | createdAt | category_definitions | created_at | timestamptz | |
| Creditor | id | creditors | id | uuid | |
| Creditor | name | creditors | name | text | |
| Creditor | category | — | — | — | dropped; superseded by categoryId, see audit #3 |
| Creditor | categoryId | creditors | category_id | uuid | FK -> category_definitions |
| Creditor | defaultAmount | creditors | default_amount | numeric(12,2) | |
| Creditor | dueDay | creditors | due_day | text | number\|'varies'\|'asap'\|null collapsed to text, see audit #5 |
| Creditor | dueDatePattern | creditors | due_date_pattern | text | |
| Creditor | notes | creditors | notes | text | |
| Creditor | address | creditors | address | text | |
| Creditor | phone | creditors | phone | text | |
| Creditor | email | creditors | email | text | |
| Creditor | website | creditors | website | text | |
| Creditor | url | creditors | url | text | |
| Creditor | accountLastFour | creditors | account_last_four | text | masked display only |
| Creditor | accountLastFours | creditors | account_last_fours | text[] | |
| Creditor | icon | creditors | icon | text | key into lib/icons.ts ICON_MAP |
| Creditor | trackDebt | creditors | track_debt | boolean | |
| Creditor | debtDetail | creditors | debt_detail | jsonb | nested object kept as jsonb, see audit #7 |
| Creditor | muted | creditors | muted | boolean | not null default false, see audit #8 |
| Creditor | archived | creditors | archived | boolean | not null default false, see audit #8 |
| Creditor | archivedAt | creditors | archived_at | timestamptz | |
| Creditor | owner | creditors | owner | uuid | soft FK -> users |
| Creditor | active | creditors | active | boolean | |
| Creditor | tags | creditors | tags | text[] | |
| Creditor | createdAt | creditors | created_at | timestamptz | |
| Creditor | updatedAt | creditors | updated_at | timestamptz | |
| Creditor.debtDetail | type | creditors | debt_detail->>'type' | jsonb key | 'revolving'\|'installment' |
| Creditor.debtDetail | balanceOwed | creditors | debt_detail->>'balanceOwed' | jsonb key | |
| Creditor.debtDetail | minMonthlyPayment | creditors | debt_detail->>'minMonthlyPayment' | jsonb key | backfilled from defaultAmount if missing, see audit #7 |
| Creditor.debtDetail | availableCredit | creditors | debt_detail->>'availableCredit' | jsonb key | |
| Creditor.debtDetail | creditLimit | creditors | debt_detail->>'creditLimit' | jsonb key | |
| Creditor.debtDetail | apr | creditors | debt_detail->>'apr' | jsonb key | |
| Creditor.debtDetail | promoEndDate (legacy) | — | — | — | stripped on load by app; excluded, see audit note in Step 1A |
| IncomeSource (Income) | id | incomes | id | uuid | |
| IncomeSource | name | incomes | name | text | |
| IncomeSource | group | — | — | — | dropped; superseded by categoryId, see audit #4 |
| IncomeSource | categoryId | incomes | category_id | uuid | FK -> category_definitions |
| IncomeSource | type | incomes | type | text | |
| IncomeSource | amount | incomes | amount | numeric(12,2) | |
| IncomeSource | frequency | incomes | frequency | text | check constraint |
| IncomeSource | owner | incomes | owner | uuid | soft FK -> users |
| IncomeSource | icon | incomes | icon | text | |
| IncomeSource | muted | incomes | muted | boolean | |
| IncomeSource | archived | incomes | archived | boolean | |
| IncomeSource | archivedAt | incomes | archived_at | timestamptz | |
| IncomeSource | active | incomes | active | boolean | |
| — (added) | — | incomes | created_at | timestamptz | not in TS type; added per DDL rule, see audit #9 |
| — (added) | — | incomes | updated_at | timestamptz | not in TS type; added per DDL rule, see audit #9 |
| Bill | id | bills | id | uuid | |
| Bill | name | bills | name | text | |
| Bill | nameOverride | bills | name_override | text | |
| Bill | amount | bills | amount | numeric(12,2) | |
| Bill | dueDate | bills | due_date | text | compact/ASAP forms, not a real date column |
| Bill | category | bills | category | text | one-off default if later saved to master |
| Bill | paid | bills | paid | boolean | |
| Bill | muted | bills | muted | boolean | |
| Bill | notes | bills | notes | text | |
| Bill | origin | bills | origin | text | check ('master'\|'oneoff') |
| Bill | creditorId | bills | creditor_id | uuid | provenance-only FK, see audit #12 |
| Bill | promotedToMaster | bills | promoted_to_master | boolean | |
| Bill | rowColor | bills | row_color | text | |
| — (structural) | (parent) | bills | pay_date_card_id | uuid | FK -> pay_date_cards; Bill has no `household_id` in TS, added for RLS |
| Note | id | notes | id | uuid | |
| Note | authorId | notes | author_id | uuid | FK -> users |
| Note | authorName | notes | author_name | text | denormalized snapshot, kept as-is |
| Note | text | notes | text | text | |
| Note | timestamp | notes | "timestamp" | timestamptz | quoted (reserved word) |
| — (structural) | (parent, PayDateCard.notes[]) | notes | pay_date_card_id | uuid | nullable, mutually exclusive with board_id |
| — (structural) | (parent, MonthlyBoard.sharedNotes[]) | notes | board_id | uuid | nullable, mutually exclusive with pay_date_card_id |
| TemplateBill | id | template_bills | id | uuid | |
| TemplateBill | masterListId | template_bills | master_list_id | uuid | '' sentinel -> NULL, see audit #6 |
| TemplateBill | name | template_bills | name | text | |
| TemplateBill | nameOverride | template_bills | name_override | text | |
| TemplateBill | amount | template_bills | amount | numeric(12,2) | |
| TemplateBill | dueDate | template_bills | due_date | text | |
| TemplateBill | category | template_bills | category | text | |
| TemplateBill | isOneOff | template_bills | is_one_off | boolean | |
| TemplatePayDateCard | id | template_pay_date_cards | id | uuid | |
| TemplatePayDateCard | assignedUserId | template_pay_date_cards | assigned_user_id | uuid | nullable FK -> users; '' sentinel -> NULL, see audit #15 |
| TemplatePayDateCard | incomeSourceId | template_pay_date_cards | income_source_id | uuid | nullable FK -> incomes; '' sentinel -> NULL, see audit #15 |
| TemplatePayDateCard | defaultPayAmount | template_pay_date_cards | default_pay_amount | numeric(12,2) | |
| TemplatePayDateCard | defaultPayDate | template_pay_date_cards | default_pay_date | text | e.g. "15" or "last" |
| TemplatePayDateCard | defaultPayDateMonthOffset | template_pay_date_cards | default_pay_date_month_offset | integer | not null default 0 |
| TemplatePayDateCard | boardColumn | template_pay_date_cards | board_column | smallint | |
| TemplatePayDateCard | headerColor | template_pay_date_cards | header_color | text | |
| Template | id | board_templates | id | uuid | |
| Template | name | board_templates | name | text | |
| Template | isDefault | board_templates | is_default | boolean | |
| Template | assignedUserIds | template_assigned_users | (join table) | — | array of FKs -> real join table, see audit rules |
| Template | createdAt | board_templates | created_at | timestamptz | |
| Template | updatedAt | board_templates | updated_at | timestamptz | |
| PayDateCard | id | pay_date_cards | id | uuid | |
| PayDateCard | templatePayDateCardId | pay_date_cards | template_pay_date_card_id | uuid | |
| PayDateCard | owner | pay_date_cards | owner | uuid | FK -> users |
| PayDateCard | source | pay_date_cards | source | text | denormalized income name snapshot |
| PayDateCard | payDate | pay_date_cards | pay_date | date | |
| PayDateCard | payAmount | pay_date_cards | pay_amount | numeric(12,2) | null\|undefined collapsed to NULL |
| PayDateCard | bills | bills | (child table) | — | 1:many via pay_date_card_id |
| PayDateCard | notes | notes | (child table) | — | 1:many via pay_date_card_id |
| PayDateCard | isFromTemplate | pay_date_cards | is_from_template | boolean | |
| PayDateCard | sortOrder | pay_date_cards | sort_order | integer | |
| PayDateCard | boardColumn | pay_date_cards | board_column | smallint | |
| PayDateCard | headerColor | pay_date_cards | header_color | text | |
| MonthlyBoard | id | boards | id | uuid | |
| MonthlyBoard | month | boards | month | smallint | |
| MonthlyBoard | year | boards | year | integer | |
| MonthlyBoard | label | boards | label | text | |
| MonthlyBoard | templateId | boards | template_id | uuid | FK -> board_templates |
| MonthlyBoard | payDateCards | pay_date_cards | (child table) | — | 1:many via board_id |
| MonthlyBoard | status | boards | status | text | check ('active'\|'preparing'\|'archived') |
| MonthlyBoard | sharedNotes | notes | (child table) | — | 1:many via board_id |
| MonthlyBoard | createdAt | boards | created_at | timestamptz | |
| MonthlyBoard | updatedAt | boards | updated_at | timestamptz | |
| UserPrefs (all fields) | theme, expenseView, incomeView, expenseGroupOpenState, incomeGroupOpenState, expenseDisplayPrefs, moduleHeaderColors, readNoteIds, moduleSortState, lastDashboardPath | user_prefs | prefs | jsonb | kept as single blob, not normalized — pure UI state, see SCHEMA_AUDIT.md Step 1B |
| — (session) | mypayboard-user `{ id }` | — | — | — | superseded by Supabase auth session / Clerk JWT; no table needed |
