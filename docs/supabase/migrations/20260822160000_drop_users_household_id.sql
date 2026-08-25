-- ============================================================================
-- Drop users.household_id — fully migrated to household_members
--
-- Final step of the household-id-cleanup plan. Every RLS policy (see
-- 20260822120000, 20260822140000), every application read/write, and
-- create_household_for_user (see 20260822150000) have been moved off this
-- column. household_members is now the sole source of truth for household
-- scoping everywhere.
-- ============================================================================

alter table users drop column household_id;
