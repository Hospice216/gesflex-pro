import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface UserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user?: any
  mode: "create" | "edit"
}

interface Store {
  id: string
  name: string
}

export default function UserModal({ open, onOpenChange, onSuccess, user, mode }: UserModalProps) {
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "Vendeur",
    status: "pending",
    store_id: "",
    store_ids: [] as string[],
    password: ""
  })
  const { toast } = useToast()
  const { userProfile } = useAuth()

  useEffect(() => {
    if (open) {
      fetchStores()
      if (mode === "edit" && user) {
        setFormData({
          email: user.email || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone: user.phone || "",
          role: user.role || "Vendeur",
          status: user.status || "pending",
          // store selection is handled via user_stores, not a column on users
          store_id: "",
          store_ids: [],
          password: ""
        })
        // Précharger les attributions existantes
        preloadUserStores(user.id)
      } else {
        resetForm()
      }
    }
  }, [open, mode, user])

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error('Erreur chargement magasins:', error)
    } else {
      setStores(data || [])
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "Vendeur",
      status: "pending",
      store_id: "",
      store_ids: [],
      password: ""
    })
  }

  const preloadUserStores = async (userId: string) => {
    const { data } = await supabase
      .from('user_stores')
      .select('store_id, is_primary')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })

    const selectedIds = (data || []).map((r: any) => r.store_id as string)
    const primary = (data || []).find((r: any) => r.is_primary)
    setFormData(prev => ({
      ...prev,
      store_ids: selectedIds,
      store_id: primary?.store_id ?? selectedIds[0] ?? "",
    }))
  }

  const toggleStoreId = (storeId: string, checked: boolean) => {
    setFormData(prev => {
      const current = new Set(prev.store_ids)
      if (checked) current.add(storeId)
      else current.delete(storeId)
      const next = Array.from(current)
      return {
        ...prev,
        store_ids: next,
        // si le magasin principal n'est plus sélectionné, en choisir un autre
        store_id: next.includes(prev.store_id) ? prev.store_id : (next[0] ?? ""),
      }
    })
  }

  const canAssignRole = (role: string) => {
    if (!userProfile) return false
    
    // SuperAdmin peut tout faire
    if (userProfile.role === "SuperAdmin") return true
    
    // Admin peut créer tout sauf SuperAdmin
    if (userProfile.role === "Admin" && role !== "SuperAdmin") return true
    
    return false
  }

  const getAvailableRoles = () => {
    const roles = [
      { value: "Vendeur", label: "Vendeur" },
      { value: "Manager", label: "Manager" },
      { value: "Admin", label: "Admin" },
      { value: "SuperAdmin", label: "Super Admin" }
    ]

    return roles.filter(role => canAssignRole(role.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      })
      return
    }

    if (mode === "create" && !formData.password) {
      toast({
        title: "Mot de passe requis",
        description: "Veuillez saisir un mot de passe",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (mode === "create") {
        // Sauvegarder la session actuelle (admin) pour la restaurer après signUp
        const { data: prev } = await supabase.auth.getSession()
        const previousAccessToken = prev.session?.access_token
        const previousRefreshToken = prev.session?.refresh_token
        const restorePreviousSession = async () => {
          if (previousAccessToken && previousRefreshToken) {
            await supabase.auth.setSession({
              access_token: previousAccessToken,
              refresh_token: previousRefreshToken,
            })
          }
        }

        let createdAuthUserId: string | null = null

        // Créer un nouvel utilisateur via auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name
            }
          }
        })

        if (authError) {
          // Si l'utilisateur existe déjà dans auth
          if (authError.message.includes('already registered')) {
            const { data: existingUser } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            })
            createdAuthUserId = existingUser.user?.id ?? null
          } else {
            throw authError
          }
        } else if (authData.user) {
          createdAuthUserId = authData.user.id
        }

        // Restaurer la session admin avant d'agir sur user_stores (RLS)
        await restorePreviousSession()

        if (createdAuthUserId) {
          // Upsert du profil public.users (table sans RLS)
          const { data: createdUserRow, error: upsertUserError } = await supabase
            .from("users")
            .upsert({
              auth_id: createdAuthUserId,
              email: formData.email,
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone || null,
              role: formData.role as any,
              status: formData.status as any
            }, { onConflict: 'auth_id' })
            .select('id')
            .maybeSingle()
          if (upsertUserError) throw upsertUserError

          // Attribution magasins selon rôle
          if (createdUserRow?.id) {
            const targetUserId = createdUserRow.id
            // Nettoyer d'abord toutes les attributions existantes
            await supabase.from('user_stores').delete().eq('user_id', targetUserId)

            if (formData.role === 'Vendeur') {
              if (formData.store_id) {
                const { error: insertAssignError } = await supabase
                  .from('user_stores')
                  .insert({
                    user_id: targetUserId,
                    store_id: formData.store_id,
                    is_primary: true,
                    assigned_by: userProfile?.id || null
                  })
                if (insertAssignError) throw insertAssignError
              }
            } else if (formData.role === 'Manager') {
              if (formData.store_ids && formData.store_ids.length > 0) {
                const primaryId = formData.store_id && formData.store_ids.includes(formData.store_id)
                  ? formData.store_id
                  : formData.store_ids[0]
                const rows = formData.store_ids.map((sid) => ({
                  user_id: targetUserId,
                  store_id: sid,
                  is_primary: sid === primaryId,
                  assigned_by: userProfile?.id || null
                }))
                const { error: bulkInsertErr } = await supabase.from('user_stores').insert(rows)
                if (bulkInsertErr) throw bulkInsertErr
              }
            } else {
              // Admin / SuperAdmin: aucune attribution, ils voient tout par RLS
            }
          }
        }
      } else {
        // Modifier un utilisateur existant
        const { error } = await supabase
          .from("users")
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
            role: formData.role as any,
            status: formData.status as any
          })
          .eq("id", user.id)

        if (error) throw error

        // Attribution magasins selon rôle
        await supabase.from('user_stores').delete().eq('user_id', user.id)
        if (formData.role === 'Vendeur') {
          if (formData.store_id) {
            const { error: insertError } = await supabase
              .from('user_stores')
              .insert({
                user_id: user.id,
                store_id: formData.store_id,
                is_primary: true,
                assigned_by: userProfile?.id || null
              })
            if (insertError) throw insertError
          }
        } else if (formData.role === 'Manager') {
          if (formData.store_ids && formData.store_ids.length > 0) {
            const primaryId = formData.store_id && formData.store_ids.includes(formData.store_id)
              ? formData.store_id
              : formData.store_ids[0]
            const rows = formData.store_ids.map((sid) => ({
              user_id: user.id,
              store_id: sid,
              is_primary: sid === primaryId,
              assigned_by: userProfile?.id || null
            }))
            const { error: bulkInsertErr } = await supabase.from('user_stores').insert(rows)
            if (bulkInsertErr) throw bulkInsertErr
          }
        } else {
          // Admin / SuperAdmin: aucune attribution nécessaire
        }
      }

      toast({
        title: mode === "create" ? "Utilisateur créé" : "Utilisateur modifié",
        description: mode === "create" ? "Le nouvel utilisateur a été créé avec succès" : "Les modifications ont été enregistrées",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {mode === "create" ? "Nouvel Utilisateur" : "Modifier l'Utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Créer un nouveau compte utilisateur" 
              : "Modifier les informations de l'utilisateur"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={mode === "edit"}
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">En attente</SelectItem>
          <SelectItem value="active">Actif</SelectItem>
          <SelectItem value="rejected">Rejeté</SelectItem>
        </SelectContent>
            </Select>
          </div>

          {formData.role === 'Vendeur' && (
            <div className="space-y-2">
              <Label>Magasin (un seul)</Label>
              <Select value={formData.store_id} onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun magasin assigné" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.role === 'Manager' && (
            <div className="space-y-2">
              <Label>Magasins (plusieurs)</Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                {stores.map((store) => {
                  const checked = formData.store_ids.includes(store.id)
                  return (
                    <label key={store.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => toggleStoreId(store.id, Boolean(val))}
                      />
                      <span>{store.name}</span>
                    </label>
                  )
                })}
              </div>
              {formData.store_ids.length > 0 && (
                <div className="space-y-1">
                  <Label>Magasin principal</Label>
                  <Select value={formData.store_id} onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.store_ids.map((sid) => {
                        const s = stores.find(st => st.id === sid)
                        if (!s) return null
                        return (
                          <SelectItem key={sid} value={sid}>{s.name}</SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Créer" : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}