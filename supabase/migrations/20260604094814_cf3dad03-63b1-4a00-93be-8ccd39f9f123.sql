
-- 1) Notifications: replace permissive insert policy with a relationship-scoped one
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.can_notify(_sender uuid, _recipient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _sender IS NOT NULL
    AND (
      _sender = _recipient
      OR EXISTS (
        SELECT 1 FROM public.matches m
        WHERE (
          (m.challenger_id = _sender AND m.opponent_id = _recipient)
          OR (m.opponent_id   = _sender AND m.challenger_id = _recipient)
          OR (m.is_public_spectate = true AND _recipient IN (m.challenger_id, m.opponent_id))
        )
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.can_notify(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.can_notify(uuid, uuid) TO authenticated;

CREATE POLICY "Authenticated insert scoped notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.can_notify(auth.uid(), user_id));

-- 2) Profiles: restrict SELECT to authenticated users (still public among users for leaderboard)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3) User achievements: remove client-side INSERT (must be granted server-side only)
DROP POLICY IF EXISTS "Users can earn own achievements" ON public.user_achievements;

-- 4) Lock down SECURITY DEFINER helper functions from anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin()        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)   FROM PUBLIC, anon;
-- keep authenticated execute where the app actually calls them:
GRANT  EXECUTE ON FUNCTION public.claim_first_admin()        TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role)   TO authenticated;
