import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function PendingValidation() {
  const { signOut, userProfile } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" style={{ color: 'hsl(var(--warning))' }} />
          </div>
          <CardTitle className="text-xl">Compte en attente</CardTitle>
          <CardDescription>
            Votre compte est en cours de validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Bonjour <strong>{userProfile?.first_name} {userProfile?.last_name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Votre compte a été créé avec succès et est en attente de validation par un administrateur.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous recevrez une notification par email dès que votre compte sera activé.
            </p>
          </div>
          
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}