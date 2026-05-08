-- Best-of-3 + Spectator + Synced Power-ups schema

-- 1. Add columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS series_id uuid,
  ADD COLUMN IF NOT EXISTS round_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS best_of int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_public_spectate boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_matches_series ON public.matches(series_id);

-- 2. Open SELECT to spectators when public
DROP POLICY IF EXISTS "Users view own matches" ON public.matches;
CREATE POLICY "View matches (players or public spectate)"
  ON public.matches FOR SELECT
  USING (
    auth.uid() = challenger_id
    OR auth.uid() = opponent_id
    OR is_public_spectate = true
  );

-- 3. match_events table (timeline for spectators + replay + synced power-ups)
CREATE TABLE IF NOT EXISTS public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_index int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON public.match_events(match_id, created_at);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Anyone who can SELECT the match can read its events
CREATE POLICY "Read events for visible matches"
  ON public.match_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_events.match_id
        AND (
          auth.uid() = m.challenger_id
          OR auth.uid() = m.opponent_id
          OR m.is_public_spectate = true
        )
    )
  );

-- Only the players can insert events (and only their own user_id)
CREATE POLICY "Players insert their events"
  ON public.match_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_events.match_id
        AND (auth.uid() = m.challenger_id OR auth.uid() = m.opponent_id)
    )
  );

-- 4. Realtime
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;