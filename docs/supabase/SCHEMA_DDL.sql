-- ============================================================================
-- MyPayBoard — Supabase Schema DDL
-- Generated from lib/types.ts + lib/useMyPayBoard.ts audit (see SCHEMA_AUDIT.md)
-- Excludes dead types: LegacyTemplate*, AppUIState (no live read/write path found)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- households
-- The top-level tenant boundary. Does not exist as a concept in the current
-- localStorage app (everything is one flat blob per browser) — introduced here
-- as the RLS scoping unit for multi-device sync. `name` maps to the existing
-- optional MyPayBoardData.workspaceName field.
-- ============================================================================
create table households (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  app_version  text not null default '0.1.0', -- was MyPayBoardData.appVersion
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- users
-- A person who can sign into a household. `clerk_id` is the Clerk auth
-- identity — in the current app, User.id IS the Clerk id directly (session.ts
-- writes { id: clerkUserId } with no separate mapping). Kept as its own
-- column here so the internal uuid PK can stay stable if Clerk ids ever churn.
-- ============================================================================
create table users (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  clerk_id       text not null unique,
  name           text not null,
  role           text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  avatar_color   text not null,
  last_active    timestamptz,
  email          text,
  display_name   text,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- category_definitions
-- "Organize Lists" groups for expenses and income. Same shape serves both
-- scopes, discriminated by `scope`. Canonical grouping key going forward —
-- Creditor.category / Income.group free-text fields are considered legacy
-- and are not carried into the relational schema (see SCHEMA_AUDIT.md #3).
-- ============================================================================
create table category_definitions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  scope        text not null check (scope in ('expense', 'income')),
  is_default   boolean not null default false,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- creditors
-- Master-list expense/bill entry (Bills & Income page). Canonical source of
-- truth for name/category/amount; board Bills are frozen snapshots copied
-- from here, not live-linked (see `bills` table comment).
-- ============================================================================
create table creditors (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,
  name                  text not null,
  category_id           uuid references category_definitions(id),
  default_amount        numeric(12,2) not null,
  due_day               text, -- number, 'varies', 'asap', or null — see SCHEMA_AUDIT.md #5
  due_date_pattern       text not null default '',
  notes                 text not null default '',
  address               text,
  phone                 text,
  email                 text,
  website               text,
  url                   text,
  account_last_four     text,
  account_last_fours    text[],
  icon                  text,
  track_debt            boolean not null default false,
  -- Nested 1:1 object, not queried independently at scale — kept as jsonb
  -- per DDL rule. Shape: { type, balanceOwed, minMonthlyPayment,
  -- availableCredit?, creditLimit?, apr? }. NOT NULL when track_debt = true.
  debt_detail           jsonb,
  muted                 boolean not null default false,
  archived              boolean not null default false,
  archived_at           timestamptz,
  owner                 uuid references users(id),
  active                boolean not null default true,
  tags                  text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================================
-- incomes
-- Income source (paycheck, benefit, etc). Powers PayDateCard.payAmount
-- defaults and monthly income totals. created_at/updated_at added per DDL
-- rule even though the current TS type omits them (SCHEMA_AUDIT.md #9).
-- ============================================================================
create table incomes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  category_id  uuid references category_definitions(id),
  type         text, -- 'Employment' | 'Benefit' | free text
  amount       numeric(12,2) not null,
  frequency    text not null check (frequency in ('weekly', 'biweekly', 'monthly', '15th-30th', 'yearly')),
  owner        uuid references users(id),
  icon         text,
  muted        boolean not null default false,
  archived     boolean not null default false,
  archived_at  timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- board_templates
-- Frozen blueprint used to generate a MonthlyBoard. Values are pulled live
-- from creditors/incomes only while editing; saving freezes them — templates
-- own their own data independently thereafter.
-- ============================================================================
create table board_templates (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- template_assigned_users
-- Template.assignedUserIds[] — many-to-many join so FK integrity is real
-- (array-of-object-ids case per DDL rule, modeled as a join table rather
-- than a uuid[] column).
-- ============================================================================
create table template_assigned_users (
  household_id  uuid not null references households(id) on delete cascade,
  template_id   uuid not null references board_templates(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (template_id, user_id)
);

-- ============================================================================
-- template_pay_date_cards
-- One paycheck-shaped slot inside a template blueprint.
-- ============================================================================
create table template_pay_date_cards (
  id                             uuid primary key default gen_random_uuid(),
  household_id                   uuid not null references households(id) on delete cascade,
  template_id                    uuid not null references board_templates(id) on delete cascade,
  assigned_user_id               uuid not null references users(id),
  income_source_id               uuid not null references incomes(id),
  default_pay_amount             numeric(12,2) not null,
  default_pay_date               text not null, -- e.g. "15" or "last" — not a real date
  default_pay_date_month_offset  integer not null default 0,
  board_column                   smallint check (board_column in (1, 2)),
  header_color                   text,
  created_at                     timestamptz not null default now()
);

-- ============================================================================
-- template_bills
-- Bill blueprint attached to a template_pay_date_card. `master_list_id` is
-- nullable — the app currently stores '' as a sentinel for one-off bills
-- (SCHEMA_AUDIT.md #6); migration must convert '' -> NULL.
-- ============================================================================
create table template_bills (
  id                        uuid primary key default gen_random_uuid(),
  household_id              uuid not null references households(id) on delete cascade,
  template_pay_date_card_id uuid not null references template_pay_date_cards(id) on delete cascade,
  master_list_id            uuid references creditors(id),
  name                      text not null,
  name_override             text,
  amount                    numeric(12,2) not null,
  due_date                  text not null,
  category                  text not null,
  is_one_off                boolean not null default false,
  created_at                timestamptz not null default now()
);

-- ============================================================================
-- boards
-- A monthly pay board — the primary daily workspace. One `active` board per
-- household at a time (enforced in app logic today, not yet a DB constraint).
-- ============================================================================
create table boards (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  month        smallint not null check (month between 1 and 12),
  year         integer not null,
  label        text not null,
  template_id  uuid references board_templates(id),
  status       text not null default 'active' check (status in ('active', 'preparing', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- pay_date_cards
-- One paycheck event + the bills planned against it. `source` is a
-- denormalized snapshot of the income name at creation time (not a live FK to
-- incomes) — matches board-from-template.ts behavior.
-- ============================================================================
create table pay_date_cards (
  id                          uuid primary key default gen_random_uuid(),
  household_id                uuid not null references households(id) on delete cascade,
  board_id                    uuid not null references boards(id) on delete cascade,
  template_pay_date_card_id   uuid references template_pay_date_cards(id),
  owner                       uuid not null references users(id),
  source                      text not null,
  pay_date                    date not null,
  pay_amount                  numeric(12,2), -- null = unknown, collapses Bill's null|undefined distinction
  is_from_template            boolean not null default false,
  sort_order                  integer not null default 0,
  board_column                smallint check (board_column in (1, 2)),
  header_color                text,
  created_at                  timestamptz not null default now()
);

-- ============================================================================
-- bills
-- Snapshot bill row on a pay date card. NOT live-linked to creditors —
-- creditor_id is provenance only (see Bill type comment in lib/types.ts and
-- SCHEMA_AUDIT.md #12). due_date stays text (not a date column) because the
-- app renders/stores compact forms like "5/4" or "ASAP", not full ISO dates.
-- ============================================================================
create table bills (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  pay_date_card_id     uuid not null references pay_date_cards(id) on delete cascade,
  name                 text not null,
  name_override        text,
  amount               numeric(12,2) not null,
  due_date             text not null,
  category             text,
  paid                 boolean not null default false,
  muted                boolean not null default false,
  notes                text not null default '',
  origin               text not null check (origin in ('master', 'oneoff')),
  creditor_id          uuid references creditors(id),
  promoted_to_master   boolean not null default false,
  row_color            text,
  created_at           timestamptz not null default now()
);

-- ============================================================================
-- notes
-- Shared shape for both PayDateCard.notes[] and MonthlyBoard.sharedNotes[]
-- (see SCHEMA_AUDIT.md #11). Exactly one parent id must be set.
-- author_name is a denormalized snapshot of the author's display name at
-- post time — the app strips notes to exactly this shape on every save
-- (stripRuntimeNoteFields in useMyPayBoard.ts), so it is treated as canonical
-- persisted data, not a derived value to recompute from users.name.
-- ============================================================================
create table notes (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references households(id) on delete cascade,
  pay_date_card_id   uuid references pay_date_cards(id) on delete cascade,
  board_id           uuid references boards(id) on delete cascade,
  author_id          uuid not null references users(id),
  author_name        text not null,
  text               text not null,
  "timestamp"        timestamptz not null,
  created_at         timestamptz not null default now(),
  constraint notes_exactly_one_parent check (
    (pay_date_card_id is not null)::int + (board_id is not null)::int = 1
  )
);

-- ============================================================================
-- user_prefs
-- Per-user UI preference bucket (mypayboard-prefs-{userId} in localStorage).
-- Kept as a single jsonb blob rather than normalized columns — this is
-- display-only state (theme, group-open state, sort state, etc.), not
-- shared household data, and normalizing it would be premature relational
-- modeling for pure UI state (see SCHEMA_AUDIT.md, Step 1B note).
-- ============================================================================
create table user_prefs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  prefs        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================================
-- Indexes (FK lookup + household scoping — the two most common query shapes)
-- ============================================================================
create index idx_users_household on users(household_id);
create index idx_category_definitions_household on category_definitions(household_id);
create index idx_creditors_household on creditors(household_id);
create index idx_creditors_category on creditors(category_id);
create index idx_incomes_household on incomes(household_id);
create index idx_incomes_category on incomes(category_id);
create index idx_board_templates_household on board_templates(household_id);
create index idx_template_pay_date_cards_template on template_pay_date_cards(template_id);
create index idx_template_bills_card on template_bills(template_pay_date_card_id);
create index idx_boards_household on boards(household_id);
create index idx_pay_date_cards_board on pay_date_cards(board_id);
create index idx_bills_card on bills(pay_date_card_id);
create index idx_bills_creditor on bills(creditor_id);
create index idx_notes_card on notes(pay_date_card_id);
create index idx_notes_board on notes(board_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- ─── households — a user can only see their own household ─────────────────
alter table households enable row level security;

create policy "households select"
  on households for select
  using (
    id in (select household_id from users where clerk_id = auth.jwt() ->> 'sub')
  );

create policy "households update"
  on households for update
  using (
    id in (select household_id from users where clerk_id = auth.jwt() ->> 'sub')
  );

-- Insert/delete on households is intentionally left to a service-role-only
-- onboarding flow (creating a household is a signup-time action, not a
-- normal authenticated-user write) — no client-facing insert/delete policy.

-- ─── users — a user can only see members of their own household ───────────
alter table users enable row level security;

create policy "users select"
  on users for select
  using (
    household_id = (
      select household_id from users where clerk_id = auth.jwt() ->> 'sub'
    )
  );

create policy "users update own row"
  on users for update
  using (clerk_id = auth.jwt() ->> 'sub');

-- Insert is handled by a service-role onboarding flow (household creation);
-- delete (removing a member) is out of scope for this pass.

-- ─── Standard household-scoped tables ──────────────────────────────────────
-- category_definitions, creditors, incomes, board_templates,
-- template_assigned_users, template_pay_date_cards, template_bills, boards,
-- pay_date_cards, bills, notes, user_prefs all follow the identical pattern.

do $$
declare
  t text;
  tables text[] := array[
    'category_definitions', 'creditors', 'incomes', 'board_templates',
    'template_assigned_users', 'template_pay_date_cards', 'template_bills',
    'boards', 'pay_date_cards', 'bills', 'notes', 'user_prefs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security;', t);

    execute format($f$
      create policy "%1$s select"
        on %1$I for select
        using (
          household_id in (
            select household_id from users where clerk_id = auth.jwt() ->> 'sub'
          )
        );
    $f$, t);

    execute format($f$
      create policy "%1$s insert"
        on %1$I for insert
        with check (
          household_id in (
            select household_id from users where clerk_id = auth.jwt() ->> 'sub'
          )
        );
    $f$, t);

    execute format($f$
      create policy "%1$s update"
        on %1$I for update
        using (
          household_id in (
            select household_id from users where clerk_id = auth.jwt() ->> 'sub'
          )
        );
    $f$, t);

    execute format($f$
      create policy "%1$s delete"
        on %1$I for delete
        using (
          household_id in (
            select household_id from users where clerk_id = auth.jwt() ->> 'sub'
          )
        );
    $f$, t);
  end loop;
end $$;
