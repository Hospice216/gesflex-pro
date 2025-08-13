-- Ensure RLS and auto-provisioning for public.users works correctly
-- Safe to run multiple times (idempotent where possible)

BEGIN;

-- 1) Policy: allow a connected user to insert their own profile with default constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='users' AND policyname='User insert self'
  ) THEN
    CREATE POLICY "User insert self" ON public.users
      FOR INSERT TO anon, authenticated
      WITH CHECK (auth.uid() = auth_id AND role = 'Vendeur' AND status = 'pending');
  END IF;
END $$;

-- 2) Policy: ensure user can read their own profile (guard if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='users' AND policyname='User view self'
  ) THEN
    CREATE POLICY "User view self" ON public.users
      FOR SELECT USING (auth_id = auth.uid());
  END IF;
END $$;

-- 3) Trigger function to auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name','Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'last_name','Nouveau'),
    'Vendeur',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- 5) Backfill any missing profiles for existing auth users
INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
SELECT au.id,
       au.email,
       COALESCE(au.raw_user_meta_data->>'first_name','Utilisateur'),
       COALESCE(au.raw_user_meta_data->>'last_name','Nouveau'),
       'Vendeur',
       'pending'
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_id = au.id
WHERE pu.id IS NULL;

COMMIT;


