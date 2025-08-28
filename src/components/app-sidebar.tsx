import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  Users,
  Store,
  BarChart3,
  Settings,
  Truck,
  Receipt,
  Warehouse,
  Trophy,
  User,
  DollarSign,
  Building2,
  PieChart,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/AuthContext"
import { useEffectivePageAccess } from "@/hooks/useEffectivePageAccess"

// Menu items with roles and keys
const menuItems = [
  { 
    title: "Tableau de bord", 
    url: "/dashboard", 
    icon: LayoutDashboard, 
    key: 'dashboard',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Produits", 
    url: "/products", 
    icon: Package, 
    key: 'products',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Arrivage", 
    url: "/arrivals", 
    icon: Truck, 
    key: 'arrivals',
    roles: ["Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Achat", 
    url: "/purchases", 
    icon: ShoppingCart, 
    key: 'purchases',
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Ventes", 
    url: "/sales", 
    icon: TrendingUp, 
    key: 'sales',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Retour & Échanges", 
    url: "/returns", 
    icon: RefreshCw, 
    key: 'returns',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Transferts", 
    url: "/transfers", 
    icon: Truck, 
    key: 'transfers',
    roles: ["SuperAdmin"] 
  },
  { 
    title: "Inventaire", 
    url: "/inventory", 
    icon: Warehouse, 
    key: 'inventory',
    roles: ["Manager", "Admin", "SuperAdmin"] 
  },
]

const adminItems = [
  { 
    title: "Utilisateurs", 
    url: "/users", 
    icon: Users, 
    key: 'users',
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Magasins", 
    url: "/stores", 
    icon: Store, 
    key: 'stores',
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Fournisseurs", 
    url: "/suppliers", 
    icon: Building2, 
    key: 'suppliers',
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Finances", 
    url: "/financial", 
    icon: DollarSign, 
    key: 'financial',
    roles: ["Admin", "SuperAdmin"] 
  },
    {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3, 
    key: 'analytics',
    roles: ["Admin", "SuperAdmin"]
  },
  {
    title: "Rapports",
    url: "/reports",
    icon: PieChart, 
    key: 'reports',
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Configuration", 
    url: "/configuration", 
    icon: Settings, 
    key: 'configuration',
    roles: ["Admin", "SuperAdmin"] 
  },
]

const userItems = [
  { 
    title: "Profil", 
    url: "/profile", 
    icon: User, 
    key: 'profile',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Paramètres", 
    url: "/settings", 
    icon: Settings, 
    key: 'settings',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Gamification", 
    url: "/gamification", 
    icon: Trophy, 
    key: 'gamification',
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
]

interface AppSidebarProps {
  userRole: string
  isMobileOpen: boolean
  onMobileToggle: () => void
}

export function AppSidebar({ userRole, isMobileOpen, onMobileToggle }: AppSidebarProps) {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"
  const { userProfile } = useAuth()
  const { access } = useEffectivePageAccess(userProfile?.id, userRole as any)
  
  // État local pour la navigation mobile (plus stable)
  const [isMobile, setIsMobile] = useState(false)
  
  // États pour les sections collapsibles
  const [openSections, setOpenSections] = useState({
    main: true,
    admin: true,
    user: true
  })

  // Détection mobile personnalisée (plus stable)
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      if (mobile !== isMobile) {
        console.log('Mobile state changed:', { from: isMobile, to: mobile })
        setIsMobile(mobile)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [isMobile])

  // Debug: Log des changements d'état (réduit pour éviter le spam)
  useEffect(() => {
    if (isMobileOpen !== undefined) {
      console.log('Mobile nav state:', { isMobileOpen, isMobile, currentPath })
    }
  }, [isMobileOpen, isMobile, currentPath])

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"

  // Filter items based on user role and per-user page access
  const isEnabled = (key?: string) => {
    if (!key || !access) return true
    return (access as any)[key] !== false
  }
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole) && isEnabled(item.key as any))
  const filteredAdminItems = adminItems.filter(item => item.roles.includes(userRole) && isEnabled(item.key as any))
  const filteredUserItems = userItems.filter(item => item.roles.includes(userRole) && isEnabled(item.key as any))

  // Toggle section
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Gestion manuelle de l'ouverture/fermeture mobile
  const handleMobileToggle = () => {
    console.log('Mobile toggle clicked, current state:', isMobileOpen)
    onMobileToggle()
  }

  // Fonction helper pour fermer la navigation mobile
  const closeMobileNav = () => {
    if (isMobileOpen) {
      console.log('Closing mobile navigation')
      onMobileToggle()
    }
  }

  // Auto-close mobile sidebar when route changes (avec délai plus long)
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      const timer = setTimeout(() => {
        console.log('Auto-closing mobile nav after route change')
        onMobileToggle()
      }, 300) // Délai plus long pour éviter la fermeture immédiate
      
      return () => clearTimeout(timer)
    }
  }, [location.pathname]) // Suppression des dépendances qui causent la boucle

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="lg:hidden">
      <div 
        className="fixed inset-0 z-50 bg-black/50" 
        onClick={closeMobileNav} 
      />
      <div className="fixed left-0 top-0 h-full w-80 bg-background border-r shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded" />
            <div>
              <h1 className="text-xl font-bold text-primary">GesFlex</h1>
              <p className="text-xs text-muted-foreground">Gestion de vente</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileNav}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
          {/* Navigation principale */}
          <div>
            <Collapsible open={openSections.main} onOpenChange={() => toggleSection('main')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 px-3">
                  <span className="font-medium">Navigation principale</span>
                  {openSections.main ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                {filteredMenuItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`
                    }
                    onClick={closeMobileNav}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Administration */}
          {filteredAdminItems.length > 0 && (
            <div>
              <Collapsible open={openSections.admin} onOpenChange={() => toggleSection('admin')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-10 px-3">
                    <span className="font-medium">Administration</span>
                    {openSections.admin ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-2">
                  {filteredAdminItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`
                      }
                      onClick={closeMobileNav}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Utilisateur */}
          {filteredUserItems.length > 0 && (
            <div>
              <Collapsible open={openSections.user} onOpenChange={() => toggleSection('user')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-10 px-3">
                    <span className="font-medium">Utilisateur</span>
                    {openSections.user ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-2">
                  {filteredUserItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`
                      }
                      onClick={closeMobileNav}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r bg-gradient-to-b from-primary/5 to-background transition-all duration-300 hidden lg:block`}>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded" />
            {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-primary">GesFlex</h1>
              <p className="text-xs text-muted-foreground">Gestion de vente</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation principale
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredUserItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Utilisateur
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredUserItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>

      {/* Mobile Navigation */}
      {isMobileOpen && <MobileNavigation />}
    </>
  )
}