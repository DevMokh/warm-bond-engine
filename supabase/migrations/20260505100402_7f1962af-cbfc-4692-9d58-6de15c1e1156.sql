ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS challenger_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opponent_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_question_started_at timestamptz;