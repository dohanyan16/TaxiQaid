-- Historical entry point, now inspection only. The owner already created this security table.
-- Never recreate, drop, truncate or reset it. Review ../review/username-broker/ in numbered order.
SELECT c.relrowsecurity AS rls_enabled,
       EXISTS (SELECT FROM pg_catalog.pg_index i WHERE i.indrelid=c.oid AND i.indisprimary) AS primary_key_present
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='taxiqaid_private' AND c.relname='login_attempt_counters';
