-- RLS alone does not enable Realtime delivery — a table must also be added
-- to the supabase_realtime publication, or subscribers never receive any
-- postgres_changes events for it regardless of how correct the client-side
-- subscription code is. This is a one-time infrastructure setting, not
-- something the app can turn on for itself.

-- 1. Check whether `notes` is already in the publication:
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';

-- 2. If `notes` is not listed above, add it:
alter publication supabase_realtime add table notes;
