import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw, Database, Network, Shield, FileText } from 'lucide-react'

// ✅ NOUVEAU : Gestionnaire d'erreurs spécifique aux pages de liste

interface ListPageErrorHandlerProps {
  error: any
  onRetry?: () => void
  onRefresh?: () => void
  errorType?: 'network' | 'database' | 'permission' | 'validation' | 'unknown'
  context?: string
  className?: string
}

export function ListPageErrorHandler({ 
  error, 
  onRetry, 
  onRefresh,
  errorType = 'unknown',
  context = 'données',
  className = ''
}: ListPageErrorHandlerProps) {
  // Déterminer le type d'erreur basé sur le message
  const getErrorType = (error: any): 'network' | 'database' | 'permission' | 'validation' | 'unknown' => {
    if (!error) return 'unknown'
    
    const message = error.message?.toLowerCase() || error.toString().toLowerCase()
    
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return 'network'
    }
    
    if (message.includes('permission') || message.includes('access') || message.includes('unauthorized')) {
      return 'permission'
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
      return 'validation'
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      return 'database'
    }
    
    return 'unknown'
  }

  const detectedErrorType = errorType === 'unknown' ? getErrorType(error) : errorType

  const getErrorIcon = () => {
    switch (detectedErrorType) {
      case 'network':
        return <Network className="w-8 h-8 text-destructive" />
      case 'database':
        return <Database className="w-8 h-8 text-destructive" />
      case 'permission':
        return <Shield className="w-8 h-8 text-destructive" />
      case 'validation':
        return <FileText className="w-8 h-8 text-destructive" />
      default:
        return <AlertTriangle className="w-8 h-8 text-destructive" />
    }
  }

  const getErrorTitle = () => {
    switch (detectedErrorType) {
      case 'network':
        return 'Erreur de connexion'
      case 'database':
        return 'Erreur de base de données'
      case 'permission':
        return 'Permission refusée'
      case 'validation':
        return 'Erreur de validation'
      default:
        return 'Erreur inattendue'
    }
  }

  const getErrorDescription = () => {
    switch (detectedErrorType) {
      case 'network':
        return `Impossible de se connecter au serveur pour récupérer les ${context}. Vérifiez votre connexion internet.`
      case 'database':
        return `Erreur lors de la récupération des ${context} depuis la base de données.`
      case 'permission':
        return `Vous n'avez pas les permissions nécessaires pour accéder aux ${context}.`
      case 'validation':
        return `Les ${context} contiennent des données invalides qui ne peuvent pas être affichées.`
      default:
        return `Une erreur s'est produite lors du chargement des ${context}.`
    }
  }

  const getErrorActions = () => {
    const actions = []

    if (onRetry) {
      actions.push(
        <Button key="retry" onClick={onRetry} variant="default" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </Button>
      )
    }

    if (onRefresh) {
      actions.push(
        <Button key="refresh" onClick={onRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      )
    }

    // Action par défaut si aucune action n'est fournie
    if (actions.length === 0) {
      actions.push(
        <Button key="reload" onClick={() => window.location.reload()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Recharger la page
        </Button>
      )
    }

    return actions
  }

  const getErrorBadge = () => {
    const badgeVariants = {
      network: 'destructive' as const,
      database: 'destructive' as const,
      permission: 'secondary' as const,
      validation: 'warning' as const,
      unknown: 'destructive' as const
    }

    const badgeTexts = {
      network: 'Réseau',
      database: 'Base de données',
      permission: 'Permission',
      validation: 'Validation',
      unknown: 'Erreur'
    }

    return (
      <Badge variant={badgeVariants[detectedErrorType]} className="mb-2">
        {badgeTexts[detectedErrorType]}
      </Badge>
    )
  }

  return (
    <Card className={`bg-destructive/5 border border-destructive/20 ${className}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getErrorIcon()}
        </div>
        {getErrorBadge()}
        <CardTitle className="text-xl text-destructive">
          {getErrorTitle()}
        </CardTitle>
        <CardDescription className="text-destructive/80">
          {getErrorDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Détails de l'erreur */}
        {error && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium text-foreground mb-2">Détails techniques :</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {error.message || error.toString()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {getErrorActions()}
        </div>

        {/* Conseils selon le type d'erreur */}
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">Conseils :</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {detectedErrorType === 'network' && (
              <>
                <li>• Vérifiez votre connexion internet</li>
                <li>• Essayez de rafraîchir la page</li>
                <li>• Contactez l'administrateur si le problème persiste</li>
              </>
            )}
            {detectedErrorType === 'database' && (
              <>
                <li>• L'erreur peut être temporaire</li>
                <li>• Réessayez dans quelques instants</li>
                <li>• Contactez l'équipe technique si le problème persiste</li>
              </>
            )}
            {detectedErrorType === 'permission' && (
              <>
                <li>• Vérifiez vos droits d'accès</li>
                <li>• Contactez votre administrateur</li>
                <li>• Assurez-vous d'être connecté avec le bon compte</li>
              </>
            )}
            {detectedErrorType === 'validation' && (
              <>
                <li>• Les données peuvent être corrompues</li>
                <li>• Contactez l'équipe technique</li>
                <li>• L'erreur peut nécessiter une intervention</li>
              </>
            )}
            {detectedErrorType === 'unknown' && (
              <>
                <li>• Essayez de rafraîchir la page</li>
                <li>• Vérifiez que vous êtes bien connecté</li>
                <li>• Contactez le support technique</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant d'erreur pour les tableaux vides
interface EmptyStateHandlerProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyStateHandler({ 
  title, 
  description, 
  icon, 
  action,
  className = ''
}: EmptyStateHandlerProps) {
  return (
    <Card className={`bg-muted/30 border-dashed ${className}`}>
      <CardContent className="text-center py-12">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {description}
        </p>
        {action && <div className="flex justify-center">{action}</div>}
      </CardContent>
    </Card>
  )
}

// Composant de gestion des états de chargement avec erreur
interface LoadingErrorStateProps {
  loading: boolean
  error: any
  data: any[]
  onRetry?: () => void
  onRefresh?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  emptyAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function LoadingErrorState({ 
  loading, 
  error, 
  data, 
  onRetry, 
  onRefresh,
  emptyTitle = 'Aucune donnée',
  emptyDescription = 'Aucun élément à afficher pour le moment.',
  emptyIcon,
  emptyAction,
  children,
  className = ''
}: LoadingErrorStateProps) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ListPageErrorHandler
        error={error}
        onRetry={onRetry}
        onRefresh={onRefresh}
        context="données"
        className={className}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyStateHandler
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
        className={className}
      />
    )
  }

  return <>{children}</>
}
