-- REVIEW ONLY. Do not run before explicit approval. Dashboard Cron is the preferred browser-only interface.
-- After enabling the supported pg_cron integration, verify this exact job name does not already exist.
-- Schedule as postgres, once per minute; SQL runs in the database, with no key or network call.
SELECT cron.schedule('taxiqaid-public-login-counter-maintenance','* * * * *',
 $$SELECT taxiqaid_auth_api.maintain_public_login_counters(1000);$$);
-- Read-only operator checks after approved setup:
SELECT taxiqaid_auth_api.public_login_limits_healthy() AS cleanup_healthy;
SELECT jobid,jobname,schedule,active FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance';
-- Inspect statuses/times only. Never publish job command text, identity rows or secrets.
SELECT status,start_time,end_time FROM cron.job_run_details
 WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname='taxiqaid-public-login-counter-maintenance') ORDER BY start_time DESC LIMIT 10;
-- Approved rollback only: disable login FIRST, then unschedule this one job by its exact verified ID.
-- SELECT cron.unschedule(<privately_verified_jobid>);
