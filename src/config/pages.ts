export type UserRole = 'Vendeur' | 'Manager' | 'Admin' | 'SuperAdmin'

export type PageKey =
  | 'dashboard'
  | 'products'
  | 'arrivals'
  | 'purchases'
  | 'sales'
  | 'returns'
  | 'transfers'
  | 'inventory'
  | 'users'
  | 'stores'
  | 'suppliers'
  | 'financial'
  | 'analytics'
  | 'reports'
  | 'configuration'
  | 'profile'
  | 'settings'
  | 'gamification'

export interface PageConfigItem {
  key: PageKey
  label: string
  path: string
  allowedRoles: UserRole[]
  group: 'Navigation' | 'Administration' | 'Utilisateur'
}

export const pagesConfig: PageConfigItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', path: '/dashboard', allowedRoles: ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'products', label: 'Produits', path: '/products', allowedRoles: ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'arrivals', label: 'Arrivage', path: '/arrivals', allowedRoles: ['Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'purchases', label: 'Achat', path: '/purchases', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'sales', label: 'Ventes', path: '/sales', allowedRoles: ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'returns', label: 'Retour & Échanges', path: '/returns', allowedRoles: ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },
  { key: 'transfers', label: 'Transferts', path: '/transfers', allowedRoles: ['SuperAdmin'], group: 'Navigation' },
  { key: 'inventory', label: 'Inventaire', path: '/inventory', allowedRoles: ['Manager', 'Admin', 'SuperAdmin'], group: 'Navigation' },

  { key: 'users', label: 'Utilisateurs', path: '/users', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'stores', label: 'Magasins', path: '/stores', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'suppliers', label: 'Fournisseurs', path: '/suppliers', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'financial', label: 'Finances', path: '/financial', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'analytics', label: 'Analytics', path: '/analytics', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'reports', label: 'Rapports', path: '/reports', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Administration' },
  { key: 'configuration', label: 'Configuration', path: '/configuration', allowedRoles: ['SuperAdmin'], group: 'Administration' },

  { key: 'profile', label: 'Profil', path: '/profile', allowedRoles: ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'], group: 'Utilisateur' },
  { key: 'settings', label: 'Paramètres', path: '/settings', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Utilisateur' },
  { key: 'gamification', label: 'Gamification', path: '/gamification', allowedRoles: ['Admin', 'SuperAdmin'], group: 'Utilisateur' },
]

export function getDefaultAccessForRole(role: UserRole): Record<PageKey, boolean> {
  const map: Partial<Record<PageKey, boolean>> = {}
  for (const p of pagesConfig) {
    map[p.key] = p.allowedRoles.includes(role)
  }
  return map as Record<PageKey, boolean>
}


