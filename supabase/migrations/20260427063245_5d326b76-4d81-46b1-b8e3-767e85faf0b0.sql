
-- ============ FRIENDSHIPS ============
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own friendships" ON public.friendships
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users send friend requests" ON public.friendships
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users update friendships they're part of" ON public.friendships
FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users delete own friendships" ON public.friendships
FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);

-- ============ TOURNAMENTS ============
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty difficulty_level,
  questions_count INT NOT NULL DEFAULT 10,
  max_participants INT NOT NULL DEFAULT 16,
  status tournament_status NOT NULL DEFAULT 'upcoming',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  prize_xp INT NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by all authenticated" ON public.tournaments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tournaments" ON public.tournaments
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create tournaments" ON public.tournaments
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  finished_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by all authenticated" ON public.tournament_participants
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users join tournaments" ON public.tournament_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own participation" ON public.tournament_participants
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users leave tournaments" ON public.tournament_participants
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tournament_participants_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user ON public.tournament_participants(user_id);

-- ============ 1v1 MATCHES ============
CREATE TYPE public.match_status AS ENUM ('pending', 'active', 'completed', 'declined', 'cancelled');

CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty difficulty_level,
  questions_count INT NOT NULL DEFAULT 5,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  status match_status NOT NULL DEFAULT 'pending',
  challenger_score INT NOT NULL DEFAULT 0,
  opponent_score INT NOT NULL DEFAULT 0,
  challenger_finished_at TIMESTAMPTZ,
  opponent_finished_at TIMESTAMPTZ,
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matches" ON public.matches
FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users create challenges" ON public.matches
FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Players update their match" ON public.matches
FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_matches_challenger ON public.matches(challenger_id);
CREATE INDEX idx_matches_opponent ON public.matches(opponent_id);
