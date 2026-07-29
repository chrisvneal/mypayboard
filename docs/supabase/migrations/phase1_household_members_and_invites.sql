-- ============================================================================
-- Phase 1 — Household Members & Invites Schema
-- Additive only. Nothing in the running app reads from these tables yet.
-- `users.household_id` remains the app's actual source of truth until Phase 4.
--
-- Run this whole file in the Supabase SQL editor. Verification queries are
-- at the bottom — run them after and report results back before this is
-- considered done.
-- ============================================================================

-- ============================================================================
-- household_members
-- Join table: one user's membership in one household. Will eventually
-- replace users.household_id as the source of truth (Phase 4). For now it
-- is a shadow table, backfilled from users but not read by the app.
-- ============================================================================
create table household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);

create index idx_household_members_household on household_members(household_id);
create index idx_household_members_user on household_members(user_id);

-- ============================================================================
-- household_invites
-- Pending/accepted/expired/revoked invitations to join a household by email.
-- Not exercised by any app code until Phase 4 builds the invite flow.
-- ============================================================================
create table household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email        text not null,
  token        text not null unique,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by   uuid references users(id),
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_household_invites_household on household_invites(household_id);
create index idx_household_invites_token on household_invites(token);

-- ============================================================================
-- RLS helper functions
--
-- Both are SECURITY DEFINER so they can read household_members/users without
-- re-triggering RLS on the same table from inside a policy's USING clause —
-- this is the same shape as the create_household_for_user advisory-lock RPC.
-- Direct recursive subqueries on household_members inside its own policy
-- have caused infinite loops in this project before; going through a
-- function boundary avoids that.
-- ============================================================================

-- Is the current authenticated (Clerk) user a member of this household?
-- Source of truth is still `users.household_id` in this phase — this
-- deliberately does NOT query household_members, so the policy below is not
-- self-referencing. Phase 4 can repoint this function body at
-- household_members once that table becomes the source of truth, without
-- touching any policy that calls it.
create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where household_id = p_household_id
      and clerk_id = auth.jwt() ->> 'sub'
  );
$$;

-- Is the current authenticated (Clerk) user an 'owner' member of this
-- household? Queries household_members directly, but from inside a
-- SECURITY DEFINER function rather than a policy subquery, so it does not
-- recursively re-invoke household_members' own RLS policies.
create or replace function is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from household_members hm
    join users u on u.id = hm.user_id
    where hm.household_id = p_household_id
      and hm.role = 'owner'
      and u.clerk_id = auth.jwt() ->> 'sub'
  );
$$;

-- ============================================================================
-- RLS — household_members
-- Select only. No insert/update/delete policy: no app code writes to this
-- table yet, and the backfill below runs as the table owner (bypasses RLS).
-- ============================================================================
alter table household_members enable row level security;

create policy "household_members select"
  on household_members for select
  using (is_household_member(household_id));

-- ============================================================================
-- RLS — household_invites
-- Select only, scoped to household owners (not just any member) — invites
-- are a sensitive, owner-managed action. No app code exercises this until
-- Phase 4.
-- ============================================================================
alter table household_invites enable row level security;

create policy "household_invites select"
  on household_invites for select
  using (is_household_owner(household_id));

-- ============================================================================
-- Backfill — one household_members row per existing users row.
--
-- Per-household "owner" assignment: the earliest-created user in each
-- household (users.created_at asc), tie-broken by users.id asc for any
-- households where two members share an identical created_at timestamp.
-- Everyone else in that household becomes 'member'.
-- ============================================================================
insert into household_members (household_id, user_id, role)
select
  u.household_id,
  u.id,
  case when u.id = owner_pick.owner_user_id then 'owner' else 'member' end
from users u
join (
  select distinct on (household_id)
    household_id,
    id as owner_user_id
  from users
  order by household_id, created_at asc, id asc
) owner_pick on owner_pick.household_id = u.household_id;

-- ============================================================================
-- Verification — run after the backfill and report results back.
-- ============================================================================

-- 1. Row count in household_members must equal row count in users.
select
  (select count(*) from household_members) as household_members_count,
  (select count(*) from users) as users_count;

-- 2. Every household must have exactly one 'owner'. Empty result = pass.
select household_id, count(*) as owner_count
from household_members
where role = 'owner'
group by household_id
having count(*) <> 1;

-- 3. Flag: households where the owner pick was decided by the id tiebreaker
--    (i.e. two or more users share the same created_at). Empty result means
--    the created_at ordering was unambiguous everywhere.
select household_id, created_at, count(*) as tied_users
from users
group by household_id, created_at
having count(*) > 1;
