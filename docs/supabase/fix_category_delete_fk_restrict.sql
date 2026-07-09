-- Deleting a category currently fails silently the same way template deletes
-- did before fix_template_delete_fk_restrict.sql: creditors.category_id and
-- incomes.category_id reference category_definitions with the default
-- ON DELETE RESTRICT, so any category still referenced by a creditor or
-- income can never actually be deleted server-side.
--
-- The app's deleteCategoryDefinitions mutator already reassigns referencing
-- creditors/incomes to a fallback category before deleting — but that's a
-- separate fire-and-forget request racing the delete over the network, with
-- no guarantee it lands first. Both columns are already nullable and the
-- read path already treats a missing category gracefully (falls back to
-- "Uncategorized" — see creditorMapper.fromRow), so ON DELETE SET NULL is a
-- safe backstop: the reassignment still normally wins and moves the row to
-- the fallback category, this just guarantees the delete itself is never
-- blocked if that race is lost.

alter table creditors
  drop constraint creditors_category_id_fkey,
  add constraint creditors_category_id_fkey
    foreign key (category_id) references category_definitions(id) on delete set null;

alter table incomes
  drop constraint incomes_category_id_fkey,
  add constraint incomes_category_id_fkey
    foreign key (category_id) references category_definitions(id) on delete set null;

-- If either constraint name above doesn't match, look it up first:
-- select conname, conrelid::regclass, confrelid::regclass
-- from pg_constraint
-- where confrelid = 'category_definitions'::regclass and contype = 'f';
