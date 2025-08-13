import { useState } from "react"
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
  PieChart
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

// Menu items with roles
const menuItems = [
  { 
    title: "Tableau de bord", 
    url: "/dashboard", 
    icon: LayoutDashboard, 
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Produits", 
    url: "/products", 
    icon: Package, 
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Arrivage", 
    url: "/arrivals", 
    icon: Truck, 
    roles: ["Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Achat", 
    url: "/purchases", 
    icon: ShoppingCart, 
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Ventes", 
    url: "/sales", 
    icon: TrendingUp, 
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Retour & Échanges", 
    url: "/returns", 
    icon: RefreshCw, 
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Transferts", 
    url: "/transfers", 
    icon: Truck, 
    roles: ["Manager", "Admin", "SuperAdmin"] 
  },
  { 
    title: "Inventaire", 
    url: "/inventory", 
    icon: Warehouse, 
    roles: ["Manager", "Admin", "SuperAdmin"] 
  },
]

const adminItems = [
  { 
    title: "Utilisateurs", 
    url: "/users", 
    icon: Users, 
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Magasins", 
    url: "/stores", 
    icon: Store, 
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Fournisseurs", 
    url: "/suppliers", 
    icon: Building2, 
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Gestion Financière", 
    url: "/financial", 
    icon: DollarSign, 
    roles: ["Admin", "SuperAdmin"] 
  },
    {
    title: "Analytics",
    url: "/analytics",
    icon: PieChart,
    roles: ["Admin", "SuperAdmin"]
  },
  {
    title: "Rapports",
    url: "/reports",
    icon: BarChart3,
    roles: ["Admin", "SuperAdmin"]
  },
  { 
    title: "Gamification", 
    url: "/gamification", 
    icon: Trophy, 
    roles: ["Admin", "SuperAdmin"] 
  },
  { 
    title: "Configuration", 
    url: "/configuration", 
    icon: Settings, 
    roles: ["Admin", "SuperAdmin"] 
  },
]

const userItems = [
  { 
    title: "Mon Profil", 
    url: "/profile", 
    icon: User, 
    roles: ["Vendeur", "Manager", "Admin", "SuperAdmin"] 
  },
]

interface AppSidebarProps {
  userRole?: string
}

export function AppSidebar({ userRole = "Vendeur" }: AppSidebarProps) {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"

  // Filter items based on user role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole))
  const filteredAdminItems = adminItems.filter(item => item.roles.includes(userRole))
  const filteredUserItems = userItems.filter(item => item.roles.includes(userRole))

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r bg-gradient-to-b from-primary/5 to-background transition-all duration-300`}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
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
  )
}