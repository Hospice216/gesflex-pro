-- ========================================
-- CORRECTION RLS ULTRA-SIMPLE - SANS RÉCURSION
-- ========================================

SELECT '=== CORRECTION RLS ULTRA-SIMPLE ===' as info;

-- 1. Supprimer TOUTES les politiques RLS existantes
SELECT '=== SUPPRESSION TOUTES LES POLITIQUES ===' as info;

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "admins_can_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_update_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_insert_users" ON public.users;
DROP POLICY IF EXISTS "allow_insert_for_trigger" ON public.users;
DROP POLICY IF EXISTS "admins_full_access" ON public.users;

-- 2. Désactiver temporairement RLS pour permettre les opérations
SELECT '=== DÉSACTIVATION RLS TEMPORAIRE ===' as info;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Vérifier que la table fonctionne sans RLS
SELECT '=== TEST SANS RLS ===' as info;

-- Vérifier que la table existe et a des données
SELECT 
    'Nombre d''utilisateurs' as info,
    COUNT(*) as count
FROM public.users;

-- Afficher les utilisateurs existants (si il y en a)
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status
FROM public.users
LIMIT 5;

-- 4. Réactiver RLS avec des politiques ultra-simples
SELECT '=== RÉACTIVATION RLS SIMPLE ===' as info;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique ultra-simple : permettre tout pour l'instant
CREATE POLICY "allow_all_temporarily" ON public.users
    FOR ALL USING (true);

-- 5. Vérification finale
SELECT '=== VÉRIFICATION FINALE ===' as info;

SELECT 
    'Politiques RLS créées' as info,
    COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

SELECT '=== CORRECTION RLS ULTRA-SIMPLE TERMINÉE ===' as info; 