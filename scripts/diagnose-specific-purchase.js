// Script de diagnostic pour l'achat spécifique qui cause l'erreur UUID
// Achat ID: 8e9359a4-1799-4f70-88d5-c9a4944c9d31

console.log(`
🔍 DIAGNOSTIC - Achat Spécifique Problématique

COPIEZ ET EXÉCUTEZ CES REQUÊTES SQL DANS SUPABASE SQL EDITOR :

-- ========================================
-- 1. VÉRIFIER L'ACHAT PROBLÉMATIQUE
-- ========================================

-- Vérifier l'état de l'achat spécifique
SELECT 
    id,
    store_id,
    supplier_id,
    product_id,
    quantity,
    unit_price,
    total_amount,
    created_by,
    validated_by,
    validated_quantity,
    is_validated,
    validated_at,
    created_at,
    updated_at,
    CASE 
        WHEN created_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = created_by) THEN '✅ CRÉATEUR VALIDE'
        ELSE '❌ CRÉATEUR INVALIDE'
    END as creator_status,
    CASE 
        WHEN validated_by IS NULL THEN '⏳ NON VALIDÉ'
        WHEN validated_by = '' THEN '❌ UUID VIDE'
        WHEN validated_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = validated_by) THEN '✅ VALIDATEUR VALIDE'
        ELSE '❌ VALIDATEUR INVALIDE'
    END as validator_status
FROM purchases
WHERE id = '8e9359a4-1799-4f70-88d5-c9a4944c9d31';

-- ========================================
-- 2. VÉRIFIER LES RÉFÉRENCES
-- ========================================

-- Vérifier le créateur de l'achat
SELECT 
    u.id,
    u.auth_id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status
FROM users u
INNER JOIN purchases p ON u.id = p.created_by
WHERE p.id = '8e9359a4-1799-4f70-88d5-c9a4944c9d31';

-- Vérifier le validateur (si existant)
SELECT 
    u.id,
    u.auth_id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status
FROM users u
INNER JOIN purchases p ON u.id = p.validated_by
WHERE p.id = '8e9359a4-1799-4f70-88d5-c9a4944c9d31';

-- ========================================
-- 3. CORRIGER L'ACHAT PROBLÉMATIQUE
-- ========================================

-- Corriger l'achat avec votre userProfile.id
UPDATE purchases 
SET 
    validated_by = '3224030f-ec32-4f54-abae-d957ef1a9ce1',  -- Votre userProfile.id
    validated_quantity = quantity,  -- Quantité commandée par défaut
    validated_at = now(),
    is_validated = true
WHERE id = '8e9359a4-1799-4f70-88d5-c9a4944c9d31'
  AND (validated_by IS NULL OR validated_by = '' OR NOT EXISTS (SELECT 1 FROM users WHERE id = validated_by));

-- ========================================
-- 4. VÉRIFIER LA CORRECTION
-- ========================================

-- Vérifier que l'achat est maintenant correct
SELECT 
    id,
    created_by,
    validated_by,
    validated_quantity,
    is_validated,
    validated_at,
    CASE 
        WHEN created_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = created_by) THEN '✅ CRÉATEUR VALIDE'
        ELSE '❌ CRÉATEUR INVALIDE'
    END as creator_status,
    CASE 
        WHEN validated_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = validated_by) THEN '✅ VALIDATEUR VALIDE'
        ELSE '❌ VALIDATEUR INVALIDE'
    END as validator_status
FROM purchases
WHERE id = '8e9359a4-1799-4f70-88d5-c9a4944c9d31';

-- ========================================
-- 5. VÉRIFIER TOUS LES ACHATS SIMILAIRES
-- ========================================

-- Identifier tous les achats avec des validated_by vides ou invalides
SELECT 
    id,
    created_by,
    validated_by,
    is_validated,
    created_at,
    CASE 
        WHEN validated_by IS NULL THEN '⏳ NON VALIDÉ'
        WHEN validated_by = '' THEN '❌ UUID VIDE'
        WHEN validated_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = validated_by) THEN '✅ VALIDATEUR VALIDE'
        ELSE '❌ VALIDATEUR INVALIDE'
    END as validator_status
FROM purchases
WHERE validated_by IS NULL 
   OR validated_by = '' 
   OR NOT EXISTS (SELECT 1 FROM users WHERE id = validated_by)
ORDER BY created_at DESC;
`);

console.log(`
📋 INTERPRÉTATION DES RÉSULTATS :

1. **Achat Problématique** : Doit montrer validated_by vide ou invalide
2. **Références** : Le créateur doit être valide
3. **Correction** : L'UPDATE doit affecter 1 ligne
4. **Vérification** : L'achat doit maintenant avoir un validateur valide
5. **Autres Achats** : Identifier s'il y a d'autres achats similaires

🔧 SOLUTION :

**Si l'achat a un validated_by vide :**
1. Exécutez la requête UPDATE (étape 3)
2. Vérifiez que la correction a fonctionné (étape 4)
3. Testez la validation dans l'application

**Si d'autres achats ont le même problème :**
1. Identifiez tous les achats problématiques (étape 5)
2. Corrigez-les un par un ou en lot
3. Ou exécutez la migration : 20250127000014-fix-invalid-purchases.sql

✅ RÉSULTAT ATTENDU :
- Achat avec validated_by valide
- Validation d'arrivage fonctionnelle
- Aucune erreur UUID vide
`); 