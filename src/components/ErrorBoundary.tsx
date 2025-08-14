import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  errorInfo?: ErrorInfo
}

function ErrorFallback({ error, errorInfo }: ErrorFallbackProps) {
  const navigate = useNavigate()

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Oups ! Quelque chose s'est mal passé
          </CardTitle>
          <CardDescription>
            Une erreur inattendue s'est produite dans l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground mb-2">Détails de l'erreur :</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="gap-2">
              <Home className="w-4 h-4" />
              Retour au tableau de bord
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && errorInfo && (
            <details className="bg-muted/50 rounded-lg p-3">
              <summary className="text-sm font-medium text-foreground cursor-pointer">
                Informations techniques (développement)
              </summary>
              <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Hook pour utiliser l'ErrorBoundary dans les composants fonctionnels
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}
