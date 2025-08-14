import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

// ✅ NOUVEAU : Gestionnaire d'erreurs de réseau

interface NetworkStatus {
  isOnline: boolean
  isConnected: boolean
  lastCheck: Date
  retryCount: number
  error?: string
}

interface NetworkErrorHandlerProps {
  children: React.ReactNode
  onNetworkChange?: (status: NetworkStatus) => void
  maxRetries?: number
  retryDelay?: number
}

export function NetworkErrorHandler({ 
  children, 
  onNetworkChange,
  maxRetries = 3,
  retryDelay = 5000
}: NetworkErrorHandlerProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastCheck: new Date(),
    retryCount: 0
  })

  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  // Vérifier la connectivité réseau
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      // Test simple de connectivité avec Supabase
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      return !error
    } catch (error) {
      return false
    }
  }

  // Mettre à jour le statut réseau
  const updateNetworkStatus = async (isOnline: boolean) => {
    const isConnected = isOnline ? await checkNetworkConnectivity() : false
    
    setNetworkStatus(prev => ({
      ...prev,
      isOnline,
      isConnected,
      lastCheck: new Date(),
      error: isOnline && !isConnected ? 'Problème de connexion au serveur' : undefined
    }))

    // Afficher la bannière hors ligne si nécessaire
    setShowOfflineBanner(!isOnline || !isConnected)

    // Notifier le composant parent
    onNetworkChange?.({
      isOnline,
      isConnected,
      lastCheck: new Date(),
      retryCount: networkStatus.retryCount,
      error: isOnline && !isConnected ? 'Problème de connexion au serveur' : undefined
    })
  }

  // Tentative de reconnexion
  const handleRetry = async () => {
    if (networkStatus.retryCount >= maxRetries) {
      setNetworkStatus(prev => ({
        ...prev,
        error: 'Nombre maximum de tentatives atteint'
      }))
      return
    }

    setNetworkStatus(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }))

    // Attendre avant de réessayer
    setTimeout(async () => {
      const isConnected = await checkNetworkConnectivity()
      
      if (isConnected) {
        setNetworkStatus(prev => ({
          ...prev,
          isConnected: true,
          error: undefined
        }))
        setShowOfflineBanner(false)
      }
    }, retryDelay)
  }

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => updateNetworkStatus(true)
    const handleOffline = () => updateNetworkStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérification périodique de la connectivité
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        await updateNetworkStatus(true)
      }
    }, 30000) // Vérifier toutes les 30 secondes

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  // Vérification initiale
  useEffect(() => {
    updateNetworkStatus(navigator.onLine)
  }, [])

  return (
    <>
      {/* Bannière de statut réseau */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-destructive/20 shadow-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {networkStatus.isOnline && !networkStatus.isConnected ? (
                  <WifiOff className="w-4 h-4 text-destructive" />
                ) : (
                  <Wifi className="w-4 h-4 text-destructive" />
                )}
                <span className="text-sm font-medium text-destructive">
                  {networkStatus.isOnline && !networkStatus.isConnected 
                    ? 'Problème de connexion au serveur'
                    : 'Vous êtes hors ligne'
                  }
                </span>
                {networkStatus.retryCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Tentative {networkStatus.retryCount}/{maxRetries}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {networkStatus.isOnline && !networkStatus.isConnected && networkStatus.retryCount < maxRetries && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowOfflineBanner(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {children}
    </>
  )
}

// Hook pour utiliser le statut réseau
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastCheck: new Date(),
    retryCount: 0
  })

  return networkStatus
}

// Composant d'indicateur de statut réseau
export function NetworkStatusIndicator() {
  const networkStatus = useNetworkStatus()

  if (networkStatus.isOnline && networkStatus.isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-xs">Connecté</span>
      </div>
    )
  }

  if (!networkStatus.isOnline) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <Wifi className="w-4 h-4" />
        <span className="text-xs">Hors ligne</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-warning">
      <AlertTriangle className="w-4 h-4" />
      <span className="text-xs">Connexion instable</span>
    </div>
  )
}

// Composant de gestion des erreurs de requête
interface QueryErrorHandlerProps {
  error: any
  onRetry?: () => void
  children?: React.ReactNode
}

export function QueryErrorHandler({ error, onRetry, children }: QueryErrorHandlerProps) {
  const isNetworkError = error?.message?.includes('fetch') || 
                        error?.message?.includes('network') ||
                        error?.message?.includes('timeout')

  if (isNetworkError) {
    return (
      <Card className="bg-destructive/10 border border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <WifiOff className="w-5 h-5" />
            Erreur de connexion
          </CardTitle>
          <CardDescription>
            Impossible de se connecter au serveur. Vérifiez votre connexion internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-destructive/10 border border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Erreur de requête
        </CardTitle>
        <CardDescription>
          Une erreur s'est produite lors de la récupération des données.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-destructive/80 mb-4">
          {error?.message || 'Erreur inconnue'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
