import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-800">
                Erreur du Tableau de Bord
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center text-gray-600">
                <p className="mb-2">
                  Une erreur s'est produite lors du chargement du tableau de bord.
                </p>
                <p className="text-sm text-gray-500">
                  L'erreur a été enregistrée et sera corrigée prochainement.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-gray-50 p-3 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Détails techniques (Développement)
                  </summary>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Erreur:</strong> {this.state.error.message}</p>
                    {this.state.errorInfo && (
                      <p><strong>Stack:</strong> {this.state.errorInfo.componentStack}</p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default DashboardErrorBoundary
