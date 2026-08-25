-- ============================================================================
-- Rewrite "users select" to drop its own dependency on users.household_id
--
-- Context: this policy already called is_household_member(), which made it
-- look migrated, but the argument it passed was household_id — the row's
-- OWN users.household_id column. That's still a hard dependency on the
-- column: Postgres refuses to DROP COLUMN while any policy references it,
-- so this would have blocked Phase 5 even though every other table was
-- already clear.
--
-- New qual: a user row is visible if it belongs (via household_members) to
-- any household the viewer is also a member of. No reference to
-- users.household_id at all, and naturally supports multi-household
-- membership if that's ever added.
-- ============================================================================

drop policy if exists "users select" on users;

create policy "users select" on users
  for select using (
    exists (
      select 1
      from household_members hm
      where hm.user_id = users.id
        and is_household_member(hm.household_id)
    )
  );
