-- Create app_settings table to store the last checked episode
-- This prevents sending duplicate notifications

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read/write
CREATE POLICY "Service role can manage app settings"
  ON public.app_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert initial value (optional - will be set on first run)
INSERT INTO public.app_settings (key, value)
VALUES ('last_episode_url', '')
ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.app_settings IS 'Stores application-level settings like last checked episode for push notifications';
