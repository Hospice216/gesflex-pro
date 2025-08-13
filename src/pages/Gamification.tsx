import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit2, Trash2, Trophy, Award, Star, Target, Users, TrendingUp } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface GamificationLevel {
  id: string
  name: string
  min_points: number
  max_points: number
  color: string
  icon: string
}

interface PointRule {
  id: string
  name: string
  description: string
  event_type: string
  points_awarded: number
  condition_value: any
  is_active: boolean
}

interface GamificationBadge {
  id: string
  name: string
  description: string
  icon: string
  badge_type: string
  required_role: string
  condition_data: any
  is_active: boolean
}

interface GamificationTrophy {
  id: string
  name: string
  description: string
  icon: string
  trophy_type: string
  condition_type: string
  condition_value: number
  is_active: boolean
}

interface UserPoints {
  id: string
  user_id: string
  points: number
  reason: string
  created_at: string
  users: {
    first_name: string
    last_name: string
  }
}

export default function Gamification() {
  const [levels, setLevels] = useState<GamificationLevel[]>([])
  const [pointRules, setPointRules] = useState<PointRule[]>([])
  const [badges, setBadges] = useState<GamificationBadge[]>([])
  const [trophies, setTrophies] = useState<GamificationTrophy[]>([])
  const [userPoints, setUserPoints] = useState<UserPoints[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Dialog states
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false)
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false)
  const [isTrophyDialogOpen, setIsTrophyDialogOpen] = useState(false)
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false)

  // Form states
  const [editingLevel, setEditingLevel] = useState<GamificationLevel | null>(null)
  const [editingRule, setEditingRule] = useState<PointRule | null>(null)
  const [editingBadge, setEditingBadge] = useState<GamificationBadge | null>(null)
  const [editingTrophy, setEditingTrophy] = useState<GamificationTrophy | null>(null)

  const iconOptions = [
    { value: 'star', label: 'Étoile', icon: Star },
    { value: 'award', label: 'Récompense', icon: Award },
    { value: 'trophy', label: 'Trophée', icon: Trophy },
    { value: 'target', label: 'Cible', icon: Target },
    { value: 'users', label: 'Utilisateurs', icon: Users },
    { value: 'trending-up', label: 'Tendance', icon: TrendingUp }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [levelsRes, rulesRes, badgesRes, trophiesRes, pointsRes, usersRes] = await Promise.all([
        supabase.from('gamification_levels').select('*').order('min_points'),
        supabase.from('gamification_point_rules').select('*').order('created_at'),
        supabase.from('gamification_badges').select('*').order('created_at'),
        supabase.from('gamification_trophies').select('*').order('created_at'),
        supabase.from('gamification_points').select('*, users(first_name, last_name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('users').select('id, first_name, last_name, role').eq('status', 'active')
      ])

      setLevels(levelsRes.data || [])
      setPointRules(rulesRes.data || [])
      setBadges(badgesRes.data || [])
      setTrophies(trophiesRes.data || [])
      setUserPoints(pointsRes.data || [])
      setUsers(usersRes.data || [])
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de gamification",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveLevel = async (formData: FormData) => {
    const levelData = {
      name: formData.get('name') as string,
      min_points: parseInt(formData.get('min_points') as string),
      max_points: parseInt(formData.get('max_points') as string),
      color: formData.get('color') as string,
      icon: formData.get('icon') as string
    }

    try {
      if (editingLevel) {
        await supabase.from('gamification_levels').update(levelData).eq('id', editingLevel.id)
      } else {
        await supabase.from('gamification_levels').insert(levelData)
      }
      toast({ title: "Succès", description: `Niveau ${editingLevel ? 'modifié' : 'créé'} avec succès` })
      setIsLevelDialogOpen(false)
      setEditingLevel(null)
      fetchData()
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le niveau", variant: "destructive" })
    }
  }

  const savePointRule = async (formData: FormData) => {
    const ruleData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      event_type: formData.get('event_type') as string,
      points_awarded: parseInt(formData.get('points_awarded') as string),
      condition_value: JSON.parse(formData.get('condition_value') as string || '{}'),
      is_active: formData.get('is_active') === 'on'
    }

    try {
      if (editingRule) {
        await supabase.from('gamification_point_rules').update(ruleData).eq('id', editingRule.id)
      } else {
        await supabase.from('gamification_point_rules').insert(ruleData)
      }
      toast({ title: "Succès", description: `Règle ${editingRule ? 'modifiée' : 'créée'} avec succès` })
      setIsRuleDialogOpen(false)
      setEditingRule(null)
      fetchData()
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la règle", variant: "destructive" })
    }
  }

  const addManualPoints = async (formData: FormData) => {
    const pointsData = {
      user_id: formData.get('user_id') as string,
      points: parseInt(formData.get('points') as string),
      reason: formData.get('reason') as string
    }

    try {
      await supabase.from('gamification_points').insert(pointsData)
      toast({ title: "Succès", description: "Points ajoutés avec succès" })
      setIsPointsDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter les points", variant: "destructive" })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gamification</h1>
        <p className="text-muted-foreground">Configuration du système de récompenses</p>
      </div>

      <Tabs defaultValue="levels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="levels">Niveaux</TabsTrigger>
          <TabsTrigger value="rules">Règles de Points</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="trophies">Trophées</TabsTrigger>
          <TabsTrigger value="manual">Points Manuels</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Niveaux de Points</CardTitle>
                  <CardDescription>Configurez les niveaux basés sur les points</CardDescription>
                </div>
                <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingLevel(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau Niveau
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingLevel ? 'Modifier' : 'Créer'} un Niveau</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      saveLevel(formData)
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nom</Label>
                          <Input name="name" defaultValue={editingLevel?.name} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="min_points">Points Minimum</Label>
                            <Input name="min_points" type="number" defaultValue={editingLevel?.min_points} required />
                          </div>
                          <div>
                            <Label htmlFor="max_points">Points Maximum</Label>
                            <Input name="max_points" type="number" defaultValue={editingLevel?.max_points} required />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="color">Couleur</Label>
                          <Input name="color" type="color" defaultValue={editingLevel?.color || '#3B82F6'} />
                        </div>
                        <div>
                          <Label htmlFor="icon">Icône</Label>
                          <Select name="icon" defaultValue={editingLevel?.icon}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {iconOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center">
                                    <option.icon className="w-4 h-4 mr-2" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">Sauvegarder</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Plage de Points</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>{level.min_points} - {level.max_points}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: level.color }} />
                          {level.color}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLevel(level)
                            setIsLevelDialogOpen(true)
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Règles d'Attribution de Points</CardTitle>
                  <CardDescription>Configurez l'attribution automatique de points</CardDescription>
                </div>
                <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingRule(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvelle Règle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRule ? 'Modifier' : 'Créer'} une Règle</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      savePointRule(formData)
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nom</Label>
                          <Input name="name" defaultValue={editingRule?.name} required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea name="description" defaultValue={editingRule?.description} />
                        </div>
                        <div>
                          <Label htmlFor="event_type">Type d'Événement</Label>
                          <Select name="event_type" defaultValue={editingRule?.event_type}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale">Vente</SelectItem>
                              <SelectItem value="return">Retour</SelectItem>
                              <SelectItem value="target_achieved">Objectif Atteint</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="points_awarded">Points Attribués</Label>
                          <Input name="points_awarded" type="number" defaultValue={editingRule?.points_awarded} required />
                        </div>
                        <div>
                          <Label htmlFor="condition_value">Conditions (JSON)</Label>
                          <Textarea 
                            name="condition_value" 
                            defaultValue={JSON.stringify(editingRule?.condition_value || {}, null, 2)}
                            placeholder='{"min_amount": 100}'
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch name="is_active" defaultChecked={editingRule?.is_active !== false} />
                          <Label htmlFor="is_active">Règle Active</Label>
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">Sauvegarder</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.event_type}</TableCell>
                      <TableCell>{rule.points_awarded} pts</TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRule(rule)
                            setIsRuleDialogOpen(true)
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Attribution Manuelle de Points</CardTitle>
                    <CardDescription>Ajoutez ou retirez des points manuellement</CardDescription>
                  </div>
                  <Dialog open={isPointsDialogOpen} onOpenChange={setIsPointsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter Points
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Attribution Manuelle de Points</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        addManualPoints(formData)
                      }}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="user_id">Utilisateur</Label>
                            <Select name="user_id" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un utilisateur" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name} ({user.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="points">Points (utilisez un nombre négatif pour retirer)</Label>
                            <Input name="points" type="number" required />
                          </div>
                          <div>
                            <Label htmlFor="reason">Raison</Label>
                            <Textarea name="reason" required />
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button type="submit">Attribuer</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell>{point.users.first_name} {point.users.last_name}</TableCell>
                        <TableCell>
                          <span className={point.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {point.points >= 0 ? '+' : ''}{point.points} pts
                          </span>
                        </TableCell>
                        <TableCell>{point.reason}</TableCell>
                        <TableCell>{new Date(point.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}