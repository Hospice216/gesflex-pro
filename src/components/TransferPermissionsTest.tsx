import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, Truck, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserAccessibleStores, getAllStores, canCreateTransfer } from '@/lib/utils/store-permissions'

interface TransferPermissionsTestProps {
  className?: string
}

export default function TransferPermissionsTest({ className = '' }: TransferPermissionsTestProps) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sourceStores, setSourceStores] = useState<{ id: string; name: string }[]>([])
  const [destinationStores, setDestinationStores] = useState<{ id: string; name: string }[]>([])
  const [permissions, setPermissions] = useState<{
    canCreateTransfer: boolean
    error?: string
  } | null>(null)

  useEffect(() => {
    if (userProfile?.id && userProfile?.role) {
      testPermissions()
    }
  }, [userProfile])

  const testPermissions = async () => {
    if (!userProfile?.id || !userProfile?.role) return

    setLoading(true)
    try {
      // Test des permissions de transfert
      const [accessibleSourceStores, allDestinationStores] = await Promise.all([
        getUserAccessibleStores(userProfile.id, userProfile.role),
        getAllStores()
      ])

      setSourceStores(accessibleSourceStores)
      setDestinationStores(allDestinationStores)

      // Test d'une permission de transfert
      if (accessibleSourceStores.length > 0 && allDestinationStores.length > 0) {
        const testPermission = await canCreateTransfer(
          userProfile.id,
          userProfile.role,
          accessibleSourceStores[0].id,
          allDestinationStores[0].id
        )
        setPermissions(testPermission)
      }
    } catch (error) {
      console.error('Erreur test permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!userProfile) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Test des Permissions de Transfert
          </CardTitle>
          <CardDescription>
            Vérification des permissions et des magasins disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Utilisateur non connecté</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Test des Permissions de Transfert
        </CardTitle>
        <CardDescription>
          Vérification des permissions et des magasins disponibles pour {userProfile.first_name} {userProfile.last_name} ({userProfile.role})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Chargement des permissions...</p>
          </div>
        ) : (
          <>
            {/* Magasins Source */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Magasins Source (Accessibles)
                <Badge variant="outline">{sourceStores.length}</Badge>
              </h4>
              {sourceStores.length > 0 ? (
                <div className="grid gap-2">
                  {sourceStores.map((store) => (
                    <div key={store.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="font-medium">{store.name}</span>
                      <Badge variant="secondary">Source</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Aucun magasin source accessible
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Magasins Destination */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Magasins Destination (Tous disponibles)
                <Badge variant="outline">{destinationStores.length}</Badge>
              </h4>
              {destinationStores.length > 0 ? (
                <div className="grid gap-2">
                  {destinationStores.map((store) => (
                    <div key={store.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="font-medium">{store.name}</span>
                      <Badge variant="outline">Destination</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Aucun magasin destination disponible
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Test des Permissions */}
            <div className="space-y-2">
              <h4 className="font-semibold">Test des Permissions de Transfert</h4>
              {permissions ? (
                <div className={`p-3 rounded-lg ${
                  permissions.canCreateTransfer 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {permissions.canCreateTransfer ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      permissions.canCreateTransfer ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {permissions.canCreateTransfer ? 'Transfert autorisé' : 'Transfert refusé'}
                    </span>
                  </div>
                  {permissions.error && (
                    <p className="text-sm text-red-700 mt-1">{permissions.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez des magasins pour tester les permissions
                </p>
              )}
            </div>

            {/* Bouton de rafraîchissement */}
            <Button 
              onClick={testPermissions} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              Rafraîchir les Permissions
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
