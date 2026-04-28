ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER TABLE public.tournament_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;