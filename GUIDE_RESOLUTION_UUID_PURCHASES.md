# 🔧 GUIDE COMPLET - Résolution Problème UUID Purchases

## 🚨 PROBLÈME IDENTIFIÉ

L'erreur `new row violates row-level security policy for table "purchases"` est causée par un problème de validation UUID :

1. **Problème principal** : `PurchaseModal.tsx` utilise `user.id` (ID Supabase Auth) au lieu de `userProfile.id` (ID table users)
2. **Validation manquante** : Pas de vérification côté serveur que `created_by` existe dans `users`
3. **Politiques RLS** : Politiques inappropriées pour la validation des utilisateurs

## ✅ SOLUTIONS APPLIQUÉES

### **1. Correction du Frontend (PurchaseModal.tsx)**

✅ **Modification effectuée** :
```typescript
// AVANT (incorrect)
created_by: user.id

// APRÈS (correct)
created_by: userProfile.id
```

✅ **Validation ajoutée** :
```typescript
if (!user || !userProfile) {
  toast({
    title: "Erreur",
    description: "Vous devez être connecté pour créer un achat",
    variant: "destructive",
  })
  return
}
```

### **2. Migration de Validation (20250127000012-fix-purchases-validation-and-rls.sql)**

✅ **Fonction de validation créée** :
```sql
CREATE OR REPLACE FUNCTION validate_purchase_created_by()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que created_by existe dans la table users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.created_by) THEN
        RAISE EXCEPTION 'created_by UUID does not exist in users table'
            USING ERRCODE = '23503';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

✅ **Trigger de validation** :
```sql
CREATE TRIGGER validate_purchase_created_by_trigger
    BEFORE INSERT OR UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION validate_purchase_created_by();
```

✅ **Politiques RLS corrigées** :
```sql
-- Politique d'insertion avec validation utilisateur
CREATE POLICY "Enable insert access for admins" ON public.purchases
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('Admin', 'SuperAdmin')
    ) AND
    -- Vérifier que created_by correspond à l'utilisateur authentifié
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = NEW.created_by
        AND users.auth_id = auth.uid()
    )
);
```

## 🚀 ÉTAPES DE RÉSOLUTION

### **Étape 1 : Diagnostic**

Exécutez le script de diagnostic :
```bash
node scripts/diagnose-purchases-issue.js
```

### **Étape 2 : Exécuter la Migration**

Dans Supabase SQL Editor, exécutez :
```sql
-- Migration complète de validation et RLS
-- Fichier : 20250127000012-fix-purchases-validation-and-rls.sql
```

### **Étape 3 : Vérifier les Corrections**

1. **Vérifier le frontend** :
   - `PurchaseModal.tsx` utilise maintenant `userProfile.id`
   - Validation de connexion ajoutée

2. **Vérifier la base de données** :
   - Fonction de validation créée
   - Trigger actif
   - Politiques RLS corrigées

### **Étape 4 : Tester**

1. Rechargez l'application
2. Allez sur `/purchases`
3. Créez un nouvel achat
4. Vérifiez qu'aucune erreur n'apparaît

## 📋 VÉRIFICATIONS

### **Vérification 1 : Structure des Tables**

```sql
-- Vérifier la structure users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';

-- Vérifier la structure purchases
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'purchases' AND column_name = 'created_by';
```

### **Vérification 2 : Relations**

```sql
-- Vérifier les contraintes de clé étrangère
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'purchases';
```

### **Vérification 3 : Utilisateur Actuel**

```sql
-- Vérifier votre utilisateur (remplacez par votre email)
SELECT id, auth_id, email, role, status
FROM users
WHERE email = 'VOTRE_EMAIL';
```

### **Vérification 4 : Politiques RLS**

```sql
-- Vérifier l'état RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'purchases';

-- Vérifier les politiques
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'purchases';
```

## 🔧 RÉSOLUTION DES PROBLÈMES COURANTS

### **Problème 1 : "created_by UUID does not exist in users table"**

**Cause** : L'utilisateur n'existe pas dans la table `users`
**Solution** :
```sql
-- Vérifier si l'utilisateur existe
SELECT * FROM users WHERE auth_id = 'VOTRE_AUTH_ID';

-- Si l'utilisateur n'existe pas, le créer
INSERT INTO users (auth_id, email, first_name, last_name, role, status)
VALUES ('VOTRE_AUTH_ID', 'email@example.com', 'Prénom', 'Nom', 'Admin', 'active');
```

### **Problème 2 : "new row violates row-level security policy"**

**Cause** : Politiques RLS trop restrictives
**Solution** :
```sql
-- Désactiver temporairement RLS pour tester
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- Puis réactiver avec les bonnes politiques
-- (voir migration 20250127000012-fix-purchases-validation-and-rls.sql)
```

### **Problème 3 : "userProfile is null"**

**Cause** : Le profil utilisateur n'est pas chargé
**Solution** :
1. Vérifiez que l'utilisateur existe dans `users`
2. Vérifiez que `AuthContext` charge correctement le profil
3. Ajoutez des logs de débogage

## ✅ RÉSULTAT FINAL

Après application de toutes les corrections :

- ✅ **Frontend** : Utilise le bon UUID (`userProfile.id`)
- ✅ **Validation** : Vérification côté serveur des UUID
- ✅ **RLS** : Politiques appropriées pour Admin/SuperAdmin
- ✅ **Sécurité** : Validation que `created_by` correspond à l'utilisateur authentifié
- ✅ **Fonctionnalité** : Création d'achats opérationnelle

## 🎯 PROCHAINES ÉTAPES

1. **Tester** la création d'achats
2. **Vérifier** que les autres fonctionnalités marchent
3. **Surveiller** les logs pour d'autres erreurs
4. **Documenter** les changements pour l'équipe

---

**GesFlex Pro sera bientôt entièrement opérationnel !** 🚀 