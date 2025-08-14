# 🔍 Guide de Test Manuel - Politiques RLS

## 🎯 Objectif

Tester manuellement les politiques RLS pour s'assurer que les utilisateurs Admin et SuperAdmin peuvent modifier les configurations `system_settings`.

## 📋 Étapes de Test

### 1. Vérifier la Migration RLS

Exécutez la migration de correction des politiques RLS :

```bash
# Option 1: Reset complet (recommandé)
supabase db reset

# Option 2: Exécuter spécifiquement la migration
# Exécuter: 20250127000009-fix-system-settings-rls-policies.sql
```

### 2. Vérifier les Politiques dans Supabase

Dans l'interface Supabase, allez dans :
- **Database** → **Tables** → **system_settings** → **Policies**

Vous devriez voir :
- ✅ "Admins can view system settings" (SELECT)
- ✅ "Admins can modify system settings" (ALL)

### 3. Tester via l'Interface Web

1. **Connectez-vous en tant que SuperAdmin**
2. **Allez sur `/configuration`**
3. **Vérifiez que :**
   - ✅ Les boutons "Sauvegarder" et "Réinitialiser" sont **activés**
   - ✅ Aucun message d'avertissement de permissions n'est affiché
   - ✅ Vous pouvez modifier les paramètres

### 4. Test de Sauvegarde

1. **Modifiez un paramètre** (ex: Devise par défaut)
2. **Cliquez sur "Sauvegarder"**
3. **Vérifiez que :**
   - ✅ Le toast "Configuration sauvegardée" s'affiche
   - ✅ Aucune erreur RLS n'apparaît dans la console
   - ✅ La modification est persistée

### 5. Test avec un Utilisateur Non-Admin

1. **Connectez-vous avec un utilisateur Manager ou Vendeur**
2. **Allez sur `/configuration`**
3. **Vérifiez que :**
   - ✅ Les boutons "Sauvegarder" et "Réinitialiser" sont **désactivés**
   - ✅ Un message d'avertissement de permissions s'affiche
   - ✅ Vous pouvez consulter mais pas modifier

## 🔧 Debug en Cas de Problème

### Vérifier les Logs Console

Ouvrez la console du navigateur et vérifiez :

```javascript
// Dans la console, tapez :
console.log('Debug useSystemSettings:', {
  userProfile: window.userProfile, // Si disponible
  hasEditPermissions: window.hasEditPermissions // Si disponible
})
```

### Vérifier les Politiques RLS

Dans Supabase SQL Editor, exécutez :

```sql
-- Vérifier les politiques existantes
SELECT policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE tablename = 'system_settings';

-- Vérifier les utilisateurs Admin/SuperAdmin
SELECT id, email, role 
FROM users 
WHERE role IN ('Admin', 'SuperAdmin');
```

### Vérifier les Configurations

```sql
-- Vérifier les configurations existantes
SELECT setting_key, setting_value, setting_type, category 
FROM system_settings 
ORDER BY setting_key;
```

## 🚨 Problèmes Courants

### Problème 1: Boutons Désactivés pour SuperAdmin
- **Cause** : `userProfile` est `null` ou `undefined`
- **Solution** : Vérifier que l'utilisateur a un profil dans la table `users`

### Problème 2: Erreur RLS 42501
- **Cause** : Politiques RLS trop restrictives
- **Solution** : Exécuter la migration de correction

### Problème 3: Configurations Non Sauvegardées
- **Cause** : Problème de permissions ou de structure de table
- **Solution** : Vérifier les logs et les politiques RLS

## ✅ Checklist de Validation

- [ ] Migration RLS exécutée sans erreur
- [ ] Politiques RLS visibles dans Supabase
- [ ] Interface `/configuration` accessible
- [ ] Boutons activés pour Admin/SuperAdmin
- [ ] Message d'avertissement pour autres rôles
- [ ] Sauvegarde fonctionnelle
- [ ] Aucune erreur RLS dans la console

## 🎯 Résultat Attendu

Après ces tests, vous devriez avoir :
- ✅ **SuperAdmin/Admin** : Peuvent modifier toutes les configurations
- ✅ **Autres rôles** : Peuvent consulter mais pas modifier
- ✅ **Aucune erreur RLS** dans la console
- ✅ **Sauvegarde fonctionnelle** des paramètres

---

**💡 Conseil** : Si les tests échouent, vérifiez d'abord que la migration RLS a été exécutée correctement. 