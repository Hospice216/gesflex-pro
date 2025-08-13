-- ========================================
-- CORRECTION DES POLITIQUES RLS - RÉCURSION INFINIE
-- ========================================

SELECT '=== CORRECTION POLITIQUES RLS ===' as info;

-- 1. Supprimer toutes les politiques RLS existantes
SELECT '=== SUPPRESSION POLITIQUES RLS EXISTANTES ===' as info;

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "admins_can_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_update_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_insert_users" ON public.users;

-- 2. Créer des politiques RLS simplifiées et sans récursion
SELECT '=== CRÉATION POLITIQUES RLS SIMPLIFIÉES ===' as info;

-- Politique: Les utilisateurs peuvent voir leur propre profil (simple)
CREATE POLICY "users_can_view_own_profile" ON public.users
    FOR SELECT USING (auth.uid() = auth_id);

-- Politique: Les utilisateurs peuvent modifier leur propre profil (simple)
CREATE POLICY "users_can_update_own_profile" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

-- Politique: Permettre l'insertion pour le trigger (nécessaire pour handle_new_user)
CREATE POLICY "allow_insert_for_trigger" ON public.users
    FOR INSERT WITH CHECK (true);

-- Politique: Les utilisateurs avec rôle Admin ou SuperAdmin peuvent tout faire
-- Utiliser une approche différente pour éviter la récursion
CREATE POLICY "admins_full_access" ON public.users
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM public.users 
            WHERE role IN ('Admin', 'SuperAdmin')
        )
    );

-- 3. Vérifier les politiques créées
SELECT '=== VÉRIFICATION POLITIQUES ===' as info;

SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

-- 4. Test simple de la table users
SELECT '=== TEST SIMPLE ===' as info;

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

SELECT '=== CORRECTION RLS TERMINÉE ===' as info; 