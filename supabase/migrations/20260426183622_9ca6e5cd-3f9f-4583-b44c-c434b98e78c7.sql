-- Make first user admin (the current authenticated user will be granted admin)
-- This is a one-time setup; we'll grant admin to any existing user_roles row update via app
-- Add a helper to allow first user to claim admin (used once)

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';

  IF admin_count = 0 THEN
    -- Upgrade current user to admin (insert if not exists, or update existing user role)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Add unique constraint if it doesn't exist (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;