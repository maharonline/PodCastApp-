-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to execute cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the check-new-episodes function to run every 10 minutes
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values
SELECT cron.schedule(
    'check-new-episodes-job',           -- Job name
    '*/10 * * * *',                     -- Cron expression: every 10 minutes
    $$
    SELECT
      net.http_post(
          url:='https://bfchuybsseczmjmmosda.supabase.co/functions/v1/check-new-episodes',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
