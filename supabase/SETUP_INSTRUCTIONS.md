# Supabase Edge Function Setup Instructions

## Quick Start Guide

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
cd d:\BootWise\Project2\podapp
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref:** Supabase Dashboard → Settings → General → Reference ID

### 4. Create Database Table

Run the migration to create the `app_settings` table:

```bash
supabase db push
```

Or manually run the SQL in Supabase SQL Editor:
- Copy contents from `supabase/migrations/create_app_settings.sql`
- Paste in Supabase Dashboard → SQL Editor
- Run the query

### 5. Set Environment Secrets

```bash
supabase secrets set ONESIGNAL_APP_ID=your_app_id_from_env_file
supabase secrets set ONESIGNAL_REST_API_KEY=your_rest_api_key_from_env_file
```

**Get these values from your `.env` file**

### 6. Deploy the Edge Function

```bash
supabase functions deploy check-new-episodes
```

### 7. Test the Function

```bash
# Get your anon key from Supabase Dashboard → Settings → API
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-new-episodes' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

### 8. Set Up Cron Job (Auto-run every hour)

**Option A: Supabase Cron (Recommended)**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every hour
SELECT cron.schedule(
  'check-new-episodes-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-new-episodes',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key (Dashboard → Settings → API)

**Option B: External Cron Service**

Use [cron-job.org](https://cron-job.org) (free):
1. Create account
2. Create new cron job
3. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-new-episodes`
4. Schedule: Every hour
5. Add header: `Authorization: Bearer YOUR_ANON_KEY`

### 9. Monitor Logs

```bash
supabase functions logs check-new-episodes --follow
```

Or view in Supabase Dashboard → Edge Functions → check-new-episodes → Logs

---

## How It Works

1. **Cron job triggers** the edge function every hour
2. **Function fetches** the latest episode from RSS feed
3. **Compares** with last checked episode in database
4. **If new episode found:**
   - Sends OneSignal push notification to all users
   - Updates database with new episode URL
5. **If no new episode:**
   - Logs "No new episodes" and exits

---

## Troubleshooting

### "Failed to fetch RSS feed"
- Check if RSS URL is accessible
- Verify internet connection in edge function

### "Failed to send notification"
- Verify OneSignal credentials are correct
- Check OneSignal dashboard for errors
- Ensure you have active subscribers

### "Error updating last episode"
- Verify `app_settings` table exists
- Check RLS policies allow service role access

### View detailed logs:
```bash
supabase functions logs check-new-episodes --follow
```

---

## Testing

### Manual Test:
```bash
# Test locally first
supabase functions serve check-new-episodes

# In another terminal
curl http://localhost:54321/functions/v1/check-new-episodes
```

### Send Test Notification from OneSignal Dashboard:
1. Go to OneSignal Dashboard
2. Messages → New Push
3. Send to "All Users"
4. Test notification delivery

---

## Cost

- **Supabase Edge Functions:** 500K invocations/month (free tier)
- **OneSignal:** 10,000 notifications/month (free tier)
- **Running hourly:** ~720 invocations/month (well within limits)

---

## Next Steps

After setup:
1. ✅ Test function manually
2. ✅ Verify notification received on device
3. ✅ Set up cron job
4. ✅ Monitor logs for 24 hours
5. ✅ Celebrate! 🎉
