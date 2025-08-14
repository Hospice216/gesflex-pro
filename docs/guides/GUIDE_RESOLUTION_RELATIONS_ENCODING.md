# 🔧 GUIDE DE RÉSOLUTION - RELATIONS ET ENCODAGE

## 🚨 **PROBLÈMES IDENTIFIÉS**

### **1. Erreur de Relation User-Stores**
```
Could not find a relationship between 'users' and 'user_stores' in the schema cache
```

### **2. Erreur d'Encodage Dashboard-Stats**
```
Unexpected character ''
```

---

## ✅ **SOLUTIONS**

### **ÉTAPE 1 : Corriger la Relation User-Stores**

#### **Problème**
La contrainte de clé étrangère entre `user_stores.store_id` et `stores.id` n'a jamais été ajoutée.

#### **Solution**
1. **Exécuter le script de correction :**
   ```sql
   -- Dans l'éditeur SQL de Supabase
   \i scripts/fix-user-stores-foreign-key.sql
   ```

2. **Vérifier que la contrainte a été ajoutée :**
   ```sql
   SELECT 
       constraint_name,
       table_name,
       constraint_type
   FROM information_schema.table_constraints 
   WHERE table_name = 'user_stores'
   AND constraint_type = 'FOREIGN KEY';
   ```

3. **Tester la relation :**
   ```sql
   SELECT 
       u.email,
       s.name as store_name
   FROM users u
   JOIN user_stores us ON u.id = us.user_id
   JOIN stores s ON us.store_id = s.id
   LIMIT 5;
   ```

### **ÉTAPE 2 : Corriger l'Encodage Dashboard-Stats**

#### **Problème**
Le fichier `src/components/dashboard-stats.tsx` contient des caractères BOM invisibles.

#### **Solution**
1. **Recréer le fichier sans caractères parasites :**
   ```bash
   # Supprimer et recréer le fichier
   rm src/components/dashboard-stats.tsx
   ```

2. **Créer un nouveau fichier propre :**
   ```typescript
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
   import { TrendingUp, DollarSign, Package, AlertTriangle, Users, Store } from "lucide-react"
   import { useDashboardStats } from "@/hooks/useDashboardStats"
   import { useCurrency } from "@/hooks/useCurrency"
   import { useAuth } from "@/contexts/AuthContext"

   interface StatCardProps {
     title: string
     value: string | number
     description?: string
     trend?: string
     icon: React.ElementType
     variant?: 'default' | 'success' | 'warning' | 'info'
     loading?: boolean
   }

   function StatCard({ title, value, description, trend, icon: Icon, variant = 'default', loading = false }: StatCardProps) {
     const getCardStyles = () => {
       switch (variant) {
         case 'success':
           return "bg-gradient-success text-white border-0"
         case 'warning':
           return "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0"
         case 'info':
           return "bg-gradient-primary text-white border-0"
         default:
           return "bg-gradient-card border shadow-card hover:shadow-elevated transition-all duration-200"
       }
     }

     const getTextColor = () => {
       return variant === 'default' ? 'text-foreground' : 'text-white'
     }

     const getDescriptionColor = () => {
       return variant === 'default' ? 'text-muted-foreground' : 'text-white/80'
     }

     return (
       <Card className={`${getCardStyles()} transform hover:scale-[1.02] transition-all duration-200`}>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className={`text-sm font-medium ${getTextColor()}`}>
             {title}
           </CardTitle>
           <Icon className={`h-5 w-5 ${variant === 'default' ? 'text-muted-foreground' : 'text-white/80'}`} />
         </CardHeader>
         <CardContent>
           <div className={`text-2xl font-bold ${getTextColor()}`}>
             {loading ? (
               <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
             ) : (
               value
             )}
           </div>
           {description && (
             <div className={`text-xs ${getDescriptionColor()}`}>
               {loading ? (
                 <div className="animate-pulse bg-gray-300 h-3 w-16 rounded"></div>
               ) : (
                 description
               )}
             </div>
           )}
           {trend && (
             <div className="flex items-center mt-1">
               <TrendingUp className={`h-3 w-3 mr-1 ${variant === 'default' ? 'text-green-600' : 'text-white/80'}`} />
               <span className={`text-xs ${variant === 'default' ? 'text-green-600' : 'text-white/80'}`}>
                 {loading ? (
                   <div className="animate-pulse bg-gray-300 h-3 w-12 rounded"></div>
                 ) : (
                   trend
                 )}
               </span>
             </div>
           )}
         </CardContent>
       </Card>
     )
   }

   export function DashboardStats() {
     const { dailySales, totalSales, totalProducts, lowStockProducts, loading, error } = useDashboardStats()
     const { formatAmount, formatPercentage } = useCurrency()
     const { userProfile } = useAuth()

     // Vérifier les permissions pour afficher le chiffre d'affaires
     const canViewRevenue = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)

     const stats = [
       {
         title: "Ventes du jour",
         value: dailySales.count.toString(),
         description: `${formatAmount(dailySales.amount)} de chiffre d'affaires`,
         icon: DollarSign,
         variant: "info" as const,
         trend: formatPercentage(dailySales.percentageChange),
         loading
       },
       {
         title: "Total des ventes",
         value: totalSales.productsSold.toString(),
         description: canViewRevenue 
           ? `${formatAmount(totalSales.amount)} de chiffre d'affaires total`
           : "Produits vendus ce mois",
         icon: TrendingUp,
         variant: "success" as const,
         loading
       },
       {
         title: "Total produits",
         value: totalProducts.count.toString(),
         description: "Produits en stock",
         icon: Package,
         variant: "default" as const,
         loading
       },
       {
         title: "Stock faible",
         value: lowStockProducts.count.toString(),
         description: "Produits nécessitant un réapprovisionnement",
         icon: AlertTriangle,
         variant: "warning" as const,
         loading
       },
     ]

     if (error) {
       return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           {stats.map((stat, index) => (
             <StatCard key={index} {...stat} />
           ))}
         </div>
       )
     }

     return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {stats.map((stat, index) => (
           <StatCard key={index} {...stat} />
         ))}
       </div>
     )
   }
   ```

### **ÉTAPE 3 : Restaurer la Requête Users Complète**

#### **Après avoir corrigé la relation, restaurer la requête originale :**

```typescript
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        user_stores(
          stores(name)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    
    // Transformer les données pour correspondre à l'interface
    const transformedUsers = (data || []).map((user: any) => ({
      ...user,
      stores: user.user_stores?.map((us: any) => us.stores) || []
    }))
    
    setUsers(transformedUsers)
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error)
    toast({
      title: "Erreur",
      description: "Impossible de charger les utilisateurs",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}
```

---

## 🧪 **VÉRIFICATIONS POST-CORRECTION**

### **1. Tester la Relation User-Stores**
```sql
-- Vérifier que la relation fonctionne
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    s.name as store_name
FROM users u
LEFT JOIN user_stores us ON u.id = us.user_id
LEFT JOIN stores s ON us.store_id = s.id
LIMIT 10;
```

### **2. Tester l'Application**
```bash
# Redémarrer le serveur de développement
npm run dev
```

### **3. Vérifier les Pages**
- ✅ Page Users : Chargement sans erreur
- ✅ Dashboard : Affichage des statistiques
- ✅ Navigation : Fonctionnelle

---

## 📋 **CHECKLIST DE RÉSOLUTION**

- [ ] Exécuter `fix-user-stores-foreign-key.sql`
- [ ] Vérifier la contrainte ajoutée
- [ ] Recréer `dashboard-stats.tsx` sans caractères parasites
- [ ] Tester la page Users
- [ ] Tester le Dashboard
- [ ] Vérifier la navigation
- [ ] Tester les fonctionnalités CRUD

---

## 🎯 **RÉSULTAT ATTENDU**

Après ces corrections :
- ✅ **Page Users** : Chargement sans erreur 400
- ✅ **Dashboard** : Affichage des statistiques sans erreur d'encodage
- ✅ **Relations** : Jointures user-stores fonctionnelles
- ✅ **Interface** : Navigation fluide et responsive
