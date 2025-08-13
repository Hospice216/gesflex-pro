-- =====================================================
-- Vérifier que SEUL Admin/SuperAdmin peuvent INSERT dans stores
-- =====================================================

-- Liste des policies INSERT
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stores' AND cmd = 'INSERT';

-- Vérifier le texte des policies
SELECT pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
       pg_get_expr(pol.polwithcheck, pol.polrelid) AS withcheck_expr
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public' AND cls.relname = 'stores' AND pol.polcmd = 'i';

-- Rappel RLS activée
SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='stores';


