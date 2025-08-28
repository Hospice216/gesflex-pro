import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, Users as UsersIcon, UserCheck, UserX, Crown } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { User, UserRole, UserStatus } from "@/integrations/supabase/types"
import { handleSupabaseError } from "@/lib/utils/supabase-helpers"
import UserModal from "@/components/UserModal"

interface UserWithStores extends User {
  stores?: { name: string }[]
}

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<UserWithStores[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithStores | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const { toast } = useToast()
  const { userProfile } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          user_stores:user_stores!user_id (
            is_primary,
            stores ( name )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const transformedUsers = (data || []).map((user: any) => ({
        ...user,
        stores: (user.user_stores || [])
          .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary))
          .map((rel: any) => ({ name: rel.stores?.name || '' }))
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "SuperAdmin":
        return <Badge variant="default" className="gap-1 bg-gradient-primary text-white"><Crown className="w-3 h-3" />SuperAdmin</Badge>
      case "Admin":
        return <Badge variant="default" className="gap-1"><Crown className="w-3 h-3" />Admin</Badge>
      case "Manager":
        return <Badge variant="secondary" className="gap-1"><UserCheck className="w-3 h-3" />Manager</Badge>
      case "Vendeur":
        return <Badge variant="outline" className="gap-1"><UsersIcon className="w-3 h-3" />Vendeur</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-success text-success-foreground">Actif</Badge>
      case "pending":
        return <Badge variant="secondary">En attente</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleNewUser = () => {
    setSelectedUser(null)
    setModalMode("create")
    setShowUserModal(true)
  }

  const handleEditUser = (user: UserWithStores) => {
    setSelectedUser(user)
    setModalMode("edit")
    setShowUserModal(true)
  }

  const handleToggleUserStatus = async (user: UserWithStores) => {
    const newStatus: UserStatus = user.status === "active" ? "rejected" : "active"
    
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Statut mis à jour",
        description: `Utilisateur ${newStatus === "active" ? "activé" : "désactivé"}`,
      })

      fetchUsers()
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      })
    }
  }

  const canManageUser = (targetUser: UserWithStores) => {
    if (!userProfile) return false
    
    // SuperAdmin peut tout gérer
    if (userProfile.role === "SuperAdmin") return true
    
    // Admin peut gérer tout sauf SuperAdmin
    if (userProfile.role === "Admin" && targetUser.role !== "SuperAdmin") return true
    
    return false
  }

  const totalUsers = users.length
  const activeUsers = users.filter(user => user.status === "active").length
  const pendingUsers = users.filter(user => user.status === "pending").length
  const inactiveUsers = users.filter(user => user.status === "rejected").length

  const filteredUsers = useMemo(() => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(searchTerm).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return users
    return users.filter((user: any) => {
      const fields = [user.first_name, user.last_name, user.email, user.role, user.phone]
      const haystack = normalize(fields.filter(Boolean).join(' '))
      return tokens.every(t => haystack.includes(t))
    })
  }, [users, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-primary" />
            Utilisateurs
          </h1>
          <p className="text-muted-foreground">
            Gérez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        
        <Button onClick={handleNewUser} size="touch" className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Comptes créés
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Connectés récemment
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <UserX className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingUsers}</div>
            <p className="text-xs text-muted-foreground">
              À valider
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              Désactivés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="touch" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtres
        </Button>
      </div>

      {/* Users List */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>Gérez les comptes et permissions utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun utilisateur trouvé</p>
              <Button onClick={handleNewUser} variant="outline">
                Créer un utilisateur
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{user.stores?.map(store => store.name).join(", ") || "Aucun"}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canManageUser(user)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            Modifier profil
                          </DropdownMenuItem>
                          <DropdownMenuItem>Réinitialiser mot de passe</DropdownMenuItem>
                          <DropdownMenuItem 
                            className={user.status === "active" ? "text-warning" : "text-success"}
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.status === "active" ? "Désactiver" : "Activer"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserModal 
        open={showUserModal}
        onOpenChange={setShowUserModal}
        onSuccess={fetchUsers}
        user={selectedUser}
        mode={modalMode}
      />
    </div>
  )
}