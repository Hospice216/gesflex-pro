-- ========================================
-- CRÉATION UTILISATEUR DE TEST
-- ========================================

SELECT '=== CRÉATION UTILISATEUR DE TEST ===' as info;

-- 1. Créer un utilisateur de test dans public.users
SELECT '=== CRÉATION UTILISATEUR TEST ===' as info;

INSERT INTO public.users (
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    '3ae5d228-6b71-47e3-8d08-4c667d0c3414',
    'test@gesflex.com',
    'Utilisateur',
    'Test',
    'Vendeur',
    'pending',
    NOW(),
    NOW()
)
ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 2. Vérifier que l'utilisateur a été créé
SELECT '=== VÉRIFICATION CRÉATION ===' as info;

SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM public.users 
WHERE auth_id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414';

-- 3. Vérifier le nombre total d'utilisateurs
SELECT '=== STATISTIQUES ===' as info;

SELECT 
    'Nombre total d''utilisateurs' as info,
    COUNT(*) as count
FROM public.users;

-- 4. Afficher tous les utilisateurs
SELECT '=== TOUS LES UTILISATEURS ===' as info;

SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM public.users
ORDER BY created_at DESC;

SELECT '=== CRÉATION UTILISATEUR DE TEST TERMINÉE ===' as info; 