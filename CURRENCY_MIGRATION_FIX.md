# 🔧 Correction de la Migration Currency - CHECK Constraint

## ❌ Problème Rencontré

Lors de la réexécution de la migration `20250127000006-update-system-settings-simplified.sql`, une erreur de contrainte CHECK s'est produite :

```
ERROR: 23514: new row for relation "system_settings" violates check constraint "system_settings_category_check"
DETAIL: Failing row contains (..., currency.default, "XOF", string, currency, ...)
```

## 🔍 Cause du Problème

La contrainte CHECK existante sur la colonne `category` ne permettait pas la valeur `'currency'`. La migration tentait d'insérer des configurations avec la catégorie `'currency'` mais la contrainte ne l'autorisait pas.

## ✅ Solutions Appliquées

### 1. Correction des Migrations Principales

#### Migration `20250127000006-update-system-settings-simplified.sql`
- **Avant** : La contrainte CHECK n'incluait pas `'currency'`
- **Après** : La contrainte CHECK inclut maintenant `'currency'`

```sql
-- AVANT
CHECK (category IN ('general', 'business', 'inventory', 'sales', 'system', 'security', 'notifications', 'interface', 'stores', 'performance', 'maintenance'))

-- APRÈS  
CHECK (category IN ('general', 'business', 'inventory', 'sales', 'system', 'security', 'notifications', 'interface', 'stores', 'performance', 'maintenance', 'currency'))
```

#### Migration `20250127000007-safe-update-system-settings.sql`
- Même correction appliquée pour la cohérence

### 2. Suppression de la Migration Redondante

- **Supprimé** : `20250127000008-add-currency-category.sql`
- **Raison** : Son objectif est maintenant absorbé par les migrations principales

### 3. Script de Test Créé

- **Nouveau fichier** : `scripts/test-migration.sql`
- **Objectif** : Tester les opérations de migration avant exécution
- **Fonctionnalités** :
  - Vérification de la structure de la table
  - Test de la contrainte CHECK actuelle
  - Test de suppression/recréation de contrainte
  - Test d'insertion des configurations de devise
  - Vérification du résultat final

### 4. Mise à Jour de la Documentation

#### `TROUBLESHOOTING_MIGRATION.md`
- Mise à jour avec l'erreur spécifique à `currency`
- Correction des exemples de contrainte CHECK
- Mise à jour du nombre de configurations attendues (19 au lieu de 15)
- Ajout des configurations de devise dans les exemples

## 🔄 Ordre d'Exécution Recommandé

### Pour Résoudre l'Erreur Actuelle

1. **Exécuter la migration corrigée** :
   ```bash
   # Option 1: Migration complète (recommandée)
   supabase db reset
   
   # Option 2: Migration progressive
   # Exécuter: 20250127000007-safe-update-system-settings.sql
   ```

2. **Vérifier le résultat** :
   ```bash
   node scripts/verify-configuration.js
   ```

3. **Tester l'interface** :
   - Aller sur `/configuration`
   - Vérifier l'onglet "Devise"
   - Tester la sauvegarde des paramètres

### Pour les Futures Exécutions

Les migrations sont maintenant **idempotentes** et peuvent être réexécutées sans erreur.

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
💱 Configuration de devise incluse et fonctionnelle.
```

## 🛠️ Fonctionnalités de Devise Disponibles

### Configuration via Interface
- **Devise par défaut** : XOF
- **Symbole** : CFA
- **Position du symbole** : Après le montant
- **Nombre de décimales** : 0

### Utilisation en Code
```typescript
import { useCurrency } from '@/hooks/useCurrency'

function MyComponent() {
  const { formatCurrency, currencySettings } = useCurrency()
  
  return (
    <div>
      <p>Prix: {formatCurrency(15000)}</p>
      <p>Devise: {currencySettings.defaultCurrency}</p>
    </div>
  )
}
```

## ✅ Checklist de Validation

- [x] Contrainte CHECK mise à jour avec `'currency'`
- [x] Migrations idempotentes créées
- [x] Script de test créé
- [x] Documentation mise à jour
- [x] Migration redondante supprimée
- [x] Script de vérification mis à jour

## 🎯 Objectif Atteint

**19 configurations essentielles fonctionnelles incluant la configuration de devise complète !**

La configuration de devise est maintenant :
- ✅ **Configurable** via l'interface `/configuration`
- ✅ **Persistante** dans la base de données
- ✅ **Utilisable** dans tout le code via `useCurrency`
- ✅ **Idempotente** pour les migrations futures 