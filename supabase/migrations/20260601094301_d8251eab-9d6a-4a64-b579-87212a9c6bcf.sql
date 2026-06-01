
CREATE TABLE public.match_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  question_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_reactions_match ON public.match_reactions(match_id, created_at);

GRANT SELECT, INSERT ON public.match_reactions TO authenticated;
GRANT SELECT ON public.match_reactions TO anon;
GRANT ALL ON public.match_reactions TO service_role;

ALTER TABLE public.match_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read reactions for visible matches"
ON public.match_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.matches m
  WHERE m.id = match_reactions.match_id
    AND (auth.uid() = m.challenger_id OR auth.uid() = m.opponent_id OR m.is_public_spectate = true)
));

CREATE POLICY "Authenticated users post own reactions"
ON public.match_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_reactions.match_id
      AND (auth.uid() = m.challenger_id OR auth.uid() = m.opponent_id OR m.is_public_spectate = true)
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reactions;
ALTER TABLE public.match_reactions REPLICA IDENTITY FULL;
