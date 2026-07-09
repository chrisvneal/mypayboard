-- "Shared" is a real, user-facing owner option for a pay date card (the
-- paycheck belongs to both partners, not one person). resolveOwnerUuid()
-- on the TS side already maps 'shared' (and any other unresolvable value)
-- to NULL — but pay_date_cards.owner was NOT NULL, so any board containing
-- a "Shared" card silently failed the pre-flight hasResolvableOwners()
-- check in lib/supabase/mappers/boards.ts and never synced to Supabase at
-- all. This drops the NOT NULL constraint so those boards can sync with a
-- NULL owner (read back in the app as 'shared').
--
-- template_pay_date_cards.assigned_user_id is already nullable (see
-- SCHEMA_DDL.sql line 159) — no change needed there.

alter table pay_date_cards alter column owner drop not null;
