import { useAuth } from '@/contexts/AuthContext'
import { useEffectivePageAccess } from '@/hooks/useEffectivePageAccess'
import { PageKey } from '@/config/pages'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  pageKey?: PageKey
}

export function ProtectedRoute({ children, allowedRoles, pageKey }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const { access } = useEffectivePageAccess(userProfile?.id, userProfile?.role as any)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // AuthContext will handle redirect
  }

  if (userProfile.status !== 'active') {
    return null // AuthContext will handle redirect
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  if (pageKey && access && access[pageKey] === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Page désactivée</h1>
          <p className="text-muted-foreground">Cette page est désactivée pour votre compte.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}