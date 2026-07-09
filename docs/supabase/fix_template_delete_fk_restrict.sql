-- Deleting a board_template currently fails silently: boards.template_id and
-- pay_date_cards.template_pay_date_card_id both reference template rows with
-- the default ON DELETE RESTRICT behavior, so any template that's ever been
-- used to create a board can never actually be deleted server-side — the
-- app's local delete succeeds, but the Supabase row survives and reappears
-- on the next reload.
--
-- Per the app's own design (boards are frozen, fully-isolated snapshots at
-- creation time — see CLAUDE.md), a board must keep working exactly as-is
-- after its source template is deleted, just losing the "created from"
-- provenance link. That means both FKs should be ON DELETE SET NULL, not
-- the default RESTRICT.
--
-- Constraint names below are Postgres's default <table>_<column>_fkey
-- naming for an unnamed FK — confirm with the query at the bottom first if
-- either ALTER errors out with "constraint does not exist".

alter table boards
  drop constraint boards_template_id_fkey,
  add constraint boards_template_id_fkey
    foreign key (template_id) references board_templates(id) on delete set null;

alter table pay_date_cards
  drop constraint pay_date_cards_template_pay_date_card_id_fkey,
  add constraint pay_date_cards_template_pay_date_card_id_fkey
    foreign key (template_pay_date_card_id) references template_pay_date_cards(id) on delete set null;

-- If either constraint name above doesn't match, look it up first:
-- select conname, conrelid::regclass, confrelid::regclass
-- from pg_constraint
-- where confrelid in ('board_templates'::regclass, 'template_pay_date_cards'::regclass)
--   and contype = 'f';
