-- Create table for indexed regulations
CREATE TABLE public.indexed_regulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  title TEXT,
  content TEXT,
  summary TEXT,
  category TEXT,
  published_date TIMESTAMP WITH TIME ZONE,
  crawled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content_hash TEXT,
  is_processed BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX idx_regulations_source ON public.indexed_regulations(source);
CREATE INDEX idx_regulations_crawled_at ON public.indexed_regulations(crawled_at);
CREATE INDEX idx_regulations_category ON public.indexed_regulations(category);

-- Enable RLS
ALTER TABLE public.indexed_regulations ENABLE ROW LEVEL SECURITY;

-- Allow public read access (regulations are public data)
CREATE POLICY "Anyone can view regulations"
ON public.indexed_regulations
FOR SELECT
USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage regulations"
ON public.indexed_regulations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_indexed_regulations_updated_at
BEFORE UPDATE ON public.indexed_regulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for portal configurations
CREATE TABLE public.regulation_portals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for portals
ALTER TABLE public.regulation_portals ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view portals"
ON public.regulation_portals
FOR SELECT
USING (true);

-- Service role management
CREATE POLICY "Service role can manage portals"
ON public.regulation_portals
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;