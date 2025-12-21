-- Table to cache parsed clauses so repeat audits don't call Gemini
CREATE TABLE public.parsed_clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regulation_id UUID NOT NULL,
  clause_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  conditions TEXT,
  penalties TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (regulation_id, clause_id)
);

-- Enable Row Level Security
ALTER TABLE public.parsed_clauses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public data)
CREATE POLICY "parsed_clauses_select" ON public.parsed_clauses FOR SELECT USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "parsed_clauses_insert" ON public.parsed_clauses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "parsed_clauses_update" ON public.parsed_clauses FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Index for efficient lookup by regulation
CREATE INDEX idx_parsed_clauses_regulation ON public.parsed_clauses(regulation_id);