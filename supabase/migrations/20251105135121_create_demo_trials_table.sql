-- Create demo_trials table for rate limiting free trial recordings
CREATE TABLE IF NOT EXISTS public.demo_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  trial_count integer NOT NULL DEFAULT 1,
  last_trial_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on ip_address for fast lookups
CREATE INDEX idx_demo_trials_ip_address ON public.demo_trials(ip_address);

-- Create index on last_trial_date for cleanup queries
CREATE INDEX idx_demo_trials_last_trial_date ON public.demo_trials(last_trial_date);

-- Add unique constraint on ip_address and last_trial_date combination
CREATE UNIQUE INDEX idx_demo_trials_ip_date ON public.demo_trials(ip_address, last_trial_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.demo_trials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access (no authentication required)
-- This is safe because we're only tracking anonymous trial usage
CREATE POLICY "Allow public insert and select on demo_trials"
  ON public.demo_trials
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_demo_trials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_demo_trials_updated_at
  BEFORE UPDATE ON public.demo_trials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_demo_trials_updated_at();

-- Function to clean up old demo trial records (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_trials()
RETURNS void AS $$
BEGIN
  DELETE FROM public.demo_trials
  WHERE last_trial_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.demo_trials IS 'Tracks free trial usage by IP address to enforce rate limits (3 trials per day)';
COMMENT ON COLUMN public.demo_trials.ip_address IS 'IP address of the user attempting the trial';
COMMENT ON COLUMN public.demo_trials.trial_count IS 'Number of trials used on last_trial_date';
COMMENT ON COLUMN public.demo_trials.last_trial_date IS 'Date of the most recent trial';
