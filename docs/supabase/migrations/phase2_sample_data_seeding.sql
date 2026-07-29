-- ============================================================================
-- Phase 2 — Sample Data Seeding: schema addition
-- Additive only.
--
-- Run this whole file in the Supabase SQL editor. Verification queries are
-- at the bottom.
-- ============================================================================

alter table households
  add column sample_data_seeded_at timestamptz;

-- ============================================================================
-- Backfill — mark every EXISTING household as already-seeded.
--
-- Without this, every pre-existing household (including real, already-
-- populated ones) would have sample_data_seeded_at IS NULL just like a
-- brand-new household, and the app's atomic claim (client-side, in
-- lib/useMyPayBoard.ts) would win on their very next dashboard load and
-- inject fake "Rent / Acme Utilities / Acme Card" sample data into a real
-- household. Backfilling now() here means only households created AFTER
-- this migration ships have a null value and are eligible for the claim.
-- ============================================================================
update households
set sample_data_seeded_at = now()
where sample_data_seeded_at is null;

-- ============================================================================
-- Verification — run after and report results back.
-- ============================================================================

-- 1. No household should be null after the backfill (0 rows = pass).
select id from households where sample_data_seeded_at is null;

-- 2. Sanity check: count of households now marked seeded should equal the
--    total household count (they should match, since the update above had
--    no where-exclusions beyond the null check).
select
  (select count(*) from households) as households_count,
  (select count(*) from households where sample_data_seeded_at is not null) as seeded_count;
