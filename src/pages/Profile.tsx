import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Trophy, Award, Star, Target, Crown, Gem, Medal, User, Mail, Phone, MapPin, Calendar, TrendingUp } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface UserStats {
  totalPoints: number
  currentLevel: {
    name: string
    color: string
    icon: string
    min_points: number
    max_points: number
  } | null
  nextLevel: {
    name: string
    min_points: number
  } | null
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    awarded_at: string
  }>
  trophies: Array<{
    id: string
    name: string
    description: string
    icon: string
    awarded_at: string
    period_month: number
    period_year: number
  }>
  recentPoints: Array<{
    points: number
    reason: string
    created_at: string
  }>
}

const getIconComponent = (iconName: string) => {
  const icons: { [key: string]: any } = {
    'star': Star,
    'award': Award,
    'trophy': Trophy,
    'target': Target,
    'crown': Crown,
    'gem': Gem,
    'medal': Medal,
    'user': User
  }
  return icons[iconName] || Star
}

export default function Profile() {
  const { userProfile } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userStores, setUserStores] = useState<Array<{
    id: string
    name: string
    code: string | null
    is_active: boolean | null
    is_primary: boolean
  }>>([])
  const { toast } = useToast()

  useEffect(() => {
    if (userProfile) {
      fetchUserStats()
    }
  }, [userProfile])

  const fetchUserStats = async () => {
    if (!userProfile) return

    try {
      // Récupérer le total des points
      const { data: pointsData } = await supabase
        .from('gamification_points')
        .select('points')
        .eq('user_id', userProfile.id)

      const totalPoints = pointsData?.reduce((sum, point) => sum + point.points, 0) || 0

      // Récupérer les niveaux
      const { data: levelsData } = await supabase
        .from('gamification_levels')
        .select('*')
        .order('min_points')

      // Trouver le niveau actuel et suivant
      let currentLevel = null
      let nextLevel = null

      if (levelsData) {
        for (let i = 0; i < levelsData.length; i++) {
          const level = levelsData[i]
          if (totalPoints >= level.min_points && totalPoints <= level.max_points) {
            currentLevel = level
            nextLevel = levelsData[i + 1] || null
            break
          }
        }
        // Si aucun niveau trouvé, prendre le premier
        if (!currentLevel && levelsData.length > 0) {
          currentLevel = levelsData[0]
          nextLevel = levelsData[1] || null
        }
      }

      // Récupérer les badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          awarded_at,
          gamification_badges (
            id, name, description, icon
          )
        `)
        .eq('user_id', userProfile.id)
        .order('awarded_at', { ascending: false })

      const badges = badgesData?.map(badge => ({
        id: badge.gamification_badges.id,
        name: badge.gamification_badges.name,
        description: badge.gamification_badges.description,
        icon: badge.gamification_badges.icon,
        awarded_at: badge.awarded_at
      })) || []

      // Récupérer les trophées
      const { data: trophiesData } = await supabase
        .from('user_trophies')
        .select(`
          awarded_at, period_month, period_year,
          gamification_trophies (
            id, name, description, icon
          )
        `)
        .eq('user_id', userProfile.id)
        .order('awarded_at', { ascending: false })

      const trophies = trophiesData?.map(trophy => ({
        id: trophy.gamification_trophies.id,
        name: trophy.gamification_trophies.name,
        description: trophy.gamification_trophies.description,
        icon: trophy.gamification_trophies.icon,
        awarded_at: trophy.awarded_at,
        period_month: trophy.period_month,
        period_year: trophy.period_year
      })) || []

      // Récupérer les points récents
      const { data: recentPointsData } = await supabase
        .from('gamification_points')
        .select('points, reason, created_at')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Récupérer les magasins assignés à l'utilisateur
      const { data: storeAssignments } = await supabase
        .from('user_stores')
        .select(`
          is_primary,
          stores (
            id, name, code, is_active
          )
        `)
        .eq('user_id', userProfile.id)
        .order('is_primary', { ascending: false })

      const stores = (storeAssignments || []).map((row: any) => ({
        id: row.stores?.id as string,
        name: row.stores?.name as string,
        code: (row.stores?.code ?? null) as string | null,
        is_active: (row.stores?.is_active ?? null) as boolean | null,
        is_primary: Boolean(row.is_primary),
      }))
      setUserStores(stores)

      setUserStats({
        totalPoints,
        currentLevel,
        nextLevel,
        badges,
        trophies,
        recentPoints: recentPointsData || []
      })

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  if (!userProfile || !userStats) {
    return <div className="flex items-center justify-center h-64">Aucune donnée disponible</div>
  }

  const progressToNextLevel = userStats.nextLevel 
    ? ((userStats.totalPoints - (userStats.currentLevel?.min_points || 0)) / ((userStats.nextLevel.min_points - (userStats.currentLevel?.min_points || 0)))) * 100
    : 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground">Vos informations personnelles et récompenses</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="badges">Mes Badges</TabsTrigger>
          <TabsTrigger value="trophies">Mes Trophées</TabsTrigger>
          <TabsTrigger value="points">Historique Points</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profil et niveau */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback>
                      {userProfile.first_name.charAt(0)}{userProfile.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{userProfile.first_name} {userProfile.last_name}</h2>
                    <p className="text-muted-foreground">{userProfile.role}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats.currentLevel && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = getIconComponent(userStats.currentLevel.icon)
                          return <IconComponent className="w-5 h-5" style={{ color: userStats.currentLevel.color }} />
                        })()}
                        <span className="font-medium" style={{ color: userStats.currentLevel.color }}>
                          Niveau {userStats.currentLevel.name}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {userStats.totalPoints} points
                      </span>
                    </div>
                    
                    {userStats.nextLevel && (
                      <div className="space-y-2">
                        <Progress value={progressToNextLevel} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {userStats.nextLevel.min_points - userStats.totalPoints} points pour atteindre {userStats.nextLevel.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Mes Récompenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{userStats.totalPoints}</div>
                    <p className="text-sm text-muted-foreground">Points Total</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{userStats.badges.length}</div>
                    <p className="text-sm text-muted-foreground">Badges</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{userStats.trophies.length}</div>
                    <p className="text-sm text-muted-foreground">Trophées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Récompenses récentes */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Badges récents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Badges Récents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userStats.badges.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.badges.slice(0, 3).map((badge) => {
                      const IconComponent = getIconComponent(badge.icon)
                      return (
                        <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <IconComponent className="w-8 h-8 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{badge.name}</p>
                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(badge.awarded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucun badge obtenu</p>
                )}
              </CardContent>
            </Card>

            {/* Trophées récents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Trophées Récents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userStats.trophies.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.trophies.slice(0, 3).map((trophy) => {
                      const IconComponent = getIconComponent(trophy.icon)
                      return (
                        <div key={trophy.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <IconComponent className="w-8 h-8 text-yellow-500" />
                          <div className="flex-1">
                            <p className="font-medium">{trophy.name}</p>
                            <p className="text-sm text-muted-foreground">{trophy.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {trophy.period_month}/{trophy.period_year} - {new Date(trophy.awarded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucun trophée obtenu</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle>Tous mes Badges</CardTitle>
              <CardDescription>Les badges que vous avez obtenus au fil du temps</CardDescription>
            </CardHeader>
            <CardContent>
              {userStats.badges.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userStats.badges.map((badge) => {
                    const IconComponent = getIconComponent(badge.icon)
                    return (
                      <div key={badge.id} className="flex items-center gap-3 p-4 rounded-lg border">
                        <IconComponent className="w-10 h-10 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-sm text-muted-foreground">{badge.description}</p>
                          <Badge variant="secondary" className="mt-1">
                            {new Date(badge.awarded_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucun badge obtenu pour le moment</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trophies">
          <Card>
            <CardHeader>
              <CardTitle>Tous mes Trophées</CardTitle>
              <CardDescription>Les trophées que vous avez remportés</CardDescription>
            </CardHeader>
            <CardContent>
              {userStats.trophies.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userStats.trophies.map((trophy) => {
                    const IconComponent = getIconComponent(trophy.icon)
                    return (
                      <div key={trophy.id} className="flex items-center gap-3 p-4 rounded-lg border bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                        <IconComponent className="w-10 h-10 text-yellow-500" />
                        <div className="flex-1">
                          <p className="font-medium">{trophy.name}</p>
                          <p className="text-sm text-muted-foreground">{trophy.description}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary">
                              {trophy.period_month}/{trophy.period_year}
                            </Badge>
                            <Badge variant="secondary">
                              {new Date(trophy.awarded_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucun trophée obtenu pour le moment</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Historique des Points
              </CardTitle>
              <CardDescription>Vos dernières activités génératrices de points</CardDescription>
            </CardHeader>
            <CardContent>
              {userStats.recentPoints.length > 0 ? (
                <div className="space-y-3">
                  {userStats.recentPoints.map((point, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{point.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(point.created_at).toLocaleDateString()} à {new Date(point.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={point.points >= 0 ? "default" : "destructive"}>
                        {point.points >= 0 ? '+' : ''}{point.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucune activité de points enregistrée</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
              <CardDescription>Vos données de profil (non modifiables)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nom complet</p>
                    <p className="text-sm text-muted-foreground">{userProfile.first_name} {userProfile.last_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                  </div>
                </div>

                {userProfile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Téléphone</p>
                      <p className="text-sm text-muted-foreground">{userProfile.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Rôle</p>
                    <Badge variant="outline">{userProfile.role}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Statut</p>
                    <Badge variant={userProfile.status === 'active' ? 'default' : 'secondary'}>
                      {userProfile.status === 'active' ? 'Actif' : userProfile.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Membre depuis</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Mes Magasins</p>
                    {userStores.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {userStores.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.name}</span>
                              {s.code && (
                                <span className="text-xs text-muted-foreground">({s.code})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {s.is_primary && <Badge variant="secondary">Principal</Badge>}
                              {!s.is_active && <Badge variant="outline">Inactif</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Aucun magasin assigné</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}