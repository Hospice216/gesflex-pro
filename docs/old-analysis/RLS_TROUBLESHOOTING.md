# 🔒 Guide de Dépannage - Politiques RLS System Settings

## ❌ Erreur RLS Rencontrée

```
ERROR: 42501: new row violates row-level security policy for table "system_settings"
```

## 🔍 Cause du Problème

Les politiques RLS (Row Level Security) ne permettent pas à l'utilisateur actuel de modifier les configurations `system_settings`. Cela peut être dû à :

1. **Politiques RLS trop restrictives** : Seuls les `SuperAdmin` peuvent modifier (au lieu d'`Admin` et `SuperAdmin`)
2. **Utilisateur sans permissions** : L'utilisateur n'a pas le rôle `Admin` ou `SuperAdmin`
3. **Politiques RLS manquantes** : Les politiques n'ont pas été créées correctement

## ✅ Solutions

### Solution 1: Migration de Correction (Recommandée)

Exécutez la migration qui corrige les politiques RLS :

```bash
# Exécuter la migration de correction
supabase db reset
# ou exécuter spécifiquement:
# 20250127000009-fix-system-settings-rls-policies.sql
```

### Solution 2: Vérification Manuelle

Vérifiez les politiques RLS dans Supabase :

```sql
-- Vérifier les politiques existantes
SELECT policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE tablename = 'system_settings';

-- Vérifier le rôle de l'utilisateur actuel
SELECT role FROM users WHERE id = auth.uid();
```

### Solution 3: Correction Manuelle des Politiques

Si vous préférez corriger manuellement :

```sql
-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "SuperAdmins can modify system settings" ON public.system_settings;

-- Créer la nouvelle politique qui permet aux Admin et SuperAdmin
CREATE POLICY "Admins can modify system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'SuperAdmin')
    )
  );
```

## 🛠️ Script de Test

Utilisez le script de test pour diagnostiquer :

```bash
# Installer les dépendances si nécessaire
npm install @supabase/supabase-js

# Exécuter le script de test
node scripts/test-rls-policies.js
```

## 📊 Résultats Attendus

### Script de Test RLS
```
🔍 Test des politiques RLS pour system_settings...

📋 Test 1: Vérification des politiques RLS
📊 Politiques trouvées: 2
  - Admins can view system settings: SELECT (permissive)
  - Admins can modify system settings: ALL (permissive)

👥 Test 2: Vérification des utilisateurs Admin/SuperAdmin
📊 Utilisateurs Admin/SuperAdmin: 2
  - admin@example.com (Admin)
  - superadmin@example.com (SuperAdmin)

⚙️ Test 3: Vérification des configurations existantes
📊 Configurations trouvées: 19
  - currency.decimal_places: 0 (number)
  - currency.default: "XOF" (string)
  - currency.position: "after" (string)
  - currency.symbol: "CFA" (string)
  - maintenance.admin_only_access: false (boolean)
  ... et 14 autres

🔧 Test 4: Test de modification (simulation)
🔄 Tentative de modification de system.debug_mode...
✅ Modification réussie - Les politiques RLS fonctionnent correctement

📋 Résumé des tests:
  ✅ Politiques RLS: Configurées
  ✅ Utilisateurs Admin: Présents
  ✅ Configurations: Présentes

🎉 Tous les tests sont passés avec succès!
💡 Les politiques RLS devraient fonctionner correctement.
```

## 🔄 Ordre d'Exécution Recommandé

### Pour Résoudre l'Erreur RLS

1. **Exécuter la migration de correction** :
   ```bash
   supabase db reset
   ```

2. **Vérifier avec le script de test** :
   ```bash
   node scripts/test-rls-policies.js
   ```

3. **Tester l'interface** :
   - Aller sur `/configuration`
   - Vérifier que les boutons "Sauvegarder" et "Réinitialiser" ne sont pas désactivés
   - Tester la modification d'un paramètre

### Pour les Futures Exécutions

Les politiques RLS sont maintenant correctement configurées et permettent aux `Admin` et `SuperAdmin` de modifier les configurations.

## 🚨 Erreurs Courantes

### Erreur 1: Politique Trop Restrictive
- **Cause** : Seuls les `SuperAdmin` peuvent modifier
- **Solution** : Utiliser la migration de correction

### Erreur 2: Utilisateur Sans Permissions
- **Cause** : L'utilisateur n'a pas le rôle `Admin` ou `SuperAdmin`
- **Solution** : Vérifier le rôle de l'utilisateur dans la table `users`

### Erreur 3: Politiques Manquantes
- **Cause** : Les politiques RLS n'ont pas été créées
- **Solution** : Exécuter la migration de création de la table

## 📞 Support

En cas de problème persistant :

1. **Vérifier les logs** de migration dans Supabase
2. **Contrôler les permissions** utilisateur
3. **Utiliser le script** de test pour diagnostiquer
4. **Vérifier la connectivité** Supabase

## ✅ Checklist de Validation

- [ ] Migration de correction exécutée sans erreur
- [ ] Script de test RLS passe
- [ ] Interface `/configuration` accessible
- [ ] Boutons de sauvegarde activés pour Admin/SuperAdmin
- [ ] Message d'avertissement affiché pour les autres rôles
- [ ] Modifications de configurations fonctionnelles

## 🎯 Politiques RLS Configurées

### Lecture (SELECT)
- **Politique** : "Admins can view system settings"
- **Permissions** : `Admin`, `SuperAdmin`
- **Action** : Lecture des configurations

### Modification (ALL)
- **Politique** : "Admins can modify system settings"
- **Permissions** : `Admin`, `SuperAdmin`
- **Action** : Insertion, mise à jour, suppression des configurations

---

**🎯 Objectif : Politiques RLS fonctionnelles pour Admin et SuperAdmin !** 