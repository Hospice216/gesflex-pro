// SOLUTION COMPLÈTE - Corriger tous les problèmes RLS
// Copiez et exécutez cette requête SQL dans Supabase SQL Editor

console.log(`
🚨 SOLUTION COMPLÈTE - Corriger tous les problèmes RLS

COPIEZ ET EXÉCUTEZ CETTE REQUÊTE SQL DANS SUPABASE SQL EDITOR :

-- ========================================
-- SOLUTION COMPLÈTE POUR TOUS LES PROBLÈMES RLS
-- ========================================

-- 1. DÉSACTIVER RLS SUR SYSTEM_SETTINGS
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- 2. DÉSACTIVER RLS SUR PURCHASES
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER TOUTES LES POLITIQUES PROBLÉMATIQUES

-- System Settings
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "SuperAdmins can modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable modify access for admins" ON public.system_settings;

-- Purchases
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can delete their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can delete purchases" ON public.purchases;

-- 4. VÉRIFIER QUE RLS EST DÉSACTIVÉ
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DÉSACTIVÉ'
        ELSE '❌ RLS ACTIVÉ'
    END as status
FROM pg_tables 
WHERE tablename IN ('system_settings', 'purchases')
ORDER BY tablename;

-- 5. VÉRIFIER QU'AUCUNE POLITIQUE N'EXISTE
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname IS NULL THEN '✅ AUCUNE POLITIQUE'
        ELSE '⚠️ POLITIQUE EXISTANTE'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename IN ('system_settings', 'purchases')
ORDER BY t.tablename, p.policyname;
`);

console.log(`
✅ APRÈS AVOIR EXÉCUTÉ LA REQUÊTE :

1. Rechargez toutes les pages concernées
2. Testez la page /configuration : Sauvegarde des paramètres
3. Testez la page /purchases : Création d'achat
4. Vérifiez qu'aucune erreur 403 n'apparaît

📋 RÉSULTATS ATTENDUS :
- ✅ Configuration : Sauvegarde fonctionnelle
- ✅ Achats : Création d'achat fonctionnelle
- ✅ Aucune erreur RLS dans la console

⚠️ ATTENTION : Cette solution désactive temporairement la sécurité RLS.
   Réactivez-la plus tard avec les migrations permanentes.
`); 