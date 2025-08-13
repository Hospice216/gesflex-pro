# 🔧 Guide de Dépannage - Migration System Settings

## ❌ Erreur de Contrainte CHECK

### Erreur Rencontrée
```
ERROR: 23514: new row for relation "system_settings" violates check constraint "system_settings_category_check"
DETAIL: Failing row contains (..., currency.default, "XOF", string, currency, ...)
```

### 🔍 Cause du Problème
La contrainte CHECK existante ne permet pas les nouvelles catégories `stores`, `performance`, `maintenance`, et `currency`.

### ✅ Solutions

#### Solution 1: Utiliser la Migration Corrigée (Recommandée)
Exécutez la migration corrigée qui met à jour la contrainte en premier :

```sql
-- Exécuter: 20250127000006-update-system-settings-simplified.sql
-- ou
-- Exécuter: 20250127000007-safe-update-system-settings.sql
```

#### Solution 2: Correction Manuelle
Si vous préférez corriger manuellement :

```sql
-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_category_check;

-- 2. Ajouter la nouvelle contrainte avec toutes les catégories (incluant currency)
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_category_check 
  CHECK (category IN ('general', 'business', 'inventory', 'sales', 'system', 'security', 'notifications', 'interface', 'stores', 'performance', 'maintenance', 'currency'));

-- 3. Puis exécuter votre migration
```

#### Solution 3: Migration Progressive
Utilisez la migration progressive qui est plus sûre :

```sql
-- Exécuter: 20250127000007-safe-update-system-settings.sql
```

## 🔄 Ordre d'Exécution Recommandé

### Pour un Nouveau Projet
1. **Migration complète** : `20250127000006-update-system-settings-simplified.sql`
2. **Vérification** : Utiliser le script de vérification
3. **Test** : Tester l'interface `/configuration`

### Pour un Projet en Production
1. **Migration progressive** : `20250127000007-safe-update-system-settings.sql`
2. **Vérification** : Utiliser le script de vérification
3. **Test** : Tester l'interface `/configuration`

## 🛠️ Script de Vérification

Après avoir exécuté la migration, vérifiez que tout fonctionne :

```bash
# Installer les dépendances si nécessaire
npm install @supabase/supabase-js

# Exécuter le script de vérification
node scripts/verify-configuration.js
```

## 📊 Résultats Attendus

### Script de Vérification
```
🔍 Vérification des configurations system_settings...

📊 Total de configurations trouvées: 19

✅ Configurations présentes:
  ✅ stores.enable_transfers (boolean)
  ✅ stores.global_stock_alerts (boolean)
  ✅ stores.global_stock_threshold (number)
  ✅ stores.default_opening_time (string)
  ✅ stores.default_closing_time (string)
  ✅ system.auto_backup (boolean)
  ✅ system.debug_mode (boolean)
  ✅ system.enable_real_time_analytics (boolean)
  ✅ performance.gamification_enabled (boolean)
  ✅ performance.daily_sales_target (number)
  ✅ performance.performance_threshold (number)
  ✅ performance.points_per_sale (number)
  ✅ performance.auto_generate_reports (boolean)
  ✅ performance.report_schedule (string)
  ✅ maintenance.mode (boolean)
  ✅ maintenance.message (string)
  ✅ maintenance.admin_only_access (boolean)
  ✅ currency.default (string)
  ✅ currency.symbol (string)
  ✅ currency.position (string)
  ✅ currency.decimal_places (number)

📋 Résumé:
  ✅ Configurations correctes: 19
  ❌ Configurations manquantes: 0
  ⚠️ Configurations en trop: 0

🎉 Toutes les configurations sont correctes !
```

## 🚨 Erreurs Courantes

### Erreur 1: Contrainte CHECK
- **Cause** : Ancienne contrainte ne permet pas les nouvelles catégories
- **Solution** : Utiliser les migrations corrigées

### Erreur 2: Utilisateur Admin Manquant
- **Cause** : Aucun utilisateur Admin/SuperAdmin dans la base
- **Solution** : Créer un utilisateur admin d'abord

### Erreur 3: Permissions Insuffisantes
- **Cause** : L'utilisateur n'a pas les droits pour modifier la table
- **Solution** : Utiliser un compte avec les droits appropriés

## 📞 Support

En cas de problème persistant :

1. **Vérifier les logs** de migration dans Supabase
2. **Contrôler les permissions** utilisateur
3. **Vérifier la connectivité** Supabase
4. **Utiliser le script** de vérification pour diagnostiquer

## ✅ Checklist de Validation

- [ ] Migration exécutée sans erreur
- [ ] Script de vérification passe
- [ ] Interface `/configuration` accessible
- [ ] Tous les onglets s'affichent
- [ ] Sauvegarde des paramètres fonctionne
- [ ] Permissions Admin/SuperAdmin respectées

---

**🎯 Objectif : 19 configurations essentielles fonctionnelles (incluant la devise) !** 