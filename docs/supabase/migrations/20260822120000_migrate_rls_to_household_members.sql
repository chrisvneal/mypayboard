-- ============================================================================
-- Migrate RLS policies from users.household_id to is_household_member()
--
-- Context: `is_household_member(p_household_id uuid)` (SECURITY DEFINER,
-- backed by household_members) already exists and is already in production
-- use on household_members/household_invites/users' own select policy. Every
-- other data table still resolves household scoping the old way:
--   household_id IN (SELECT users.household_id FROM users WHERE users.clerk_id = auth.jwt()->>'sub')
-- This swaps that qual for is_household_member(household_id) on all 13
-- remaining tables, keeping every other condition on each policy unchanged
-- (none of these policies have any other condition — verified live via
-- pg_policies before writing this file). Pure drop-in replacement, no new
-- logic. Prerequisite for eventually dropping users.household_id.
--
-- Verified against live pg_policies + pg_proc on 2026-08-22 before writing
-- this migration (see Phase 1 of the household-id-cleanup plan).
-- ============================================================================

-- households (special case: the FK IS the id column, not a household_id column)
drop policy if exists "households select" on households;
create policy "households select" on households
  for select using (is_household_member(id));

drop policy if exists "households update" on households;
create policy "households update" on households
  for update using (is_household_member(id));

-- Remaining 12 tables all key off a household_id column with the identical
-- select/insert/update/delete pattern.
do $$
declare
  t text;
  tables text[] := array[
    'category_definitions',
    'creditors',
    'incomes',
    'board_templates',
    'template_assigned_users',
    'template_pay_date_cards',
    'template_bills',
    'boards',
    'pay_date_cards',
    'bills',
    'notes',
    'user_prefs'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on %I', t || ' select', t);
    execute format(
      'create policy %I on %I for select using (is_household_member(household_id))',
      t || ' select', t
    );

    execute format('drop policy if exists %I on %I', t || ' insert', t);
    execute format(
      'create policy %I on %I for insert with check (is_household_member(household_id))',
      t || ' insert', t
    );

    execute format('drop policy if exists %I on %I', t || ' update', t);
    execute format(
      'create policy %I on %I for update using (is_household_member(household_id))',
      t || ' update', t
    );

    execute format('drop policy if exists %I on %I', t || ' delete', t);
    execute format(
      'create policy %I on %I for delete using (is_household_member(household_id))',
      t || ' delete', t
    );
  end loop;
end $$;
