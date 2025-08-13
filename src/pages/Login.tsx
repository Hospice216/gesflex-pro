import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Receipt, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password, firstName, lastName)
        setSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.")
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md bg-gradient-card shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "GesFlex" : "Inscription"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Connectez-vous à votre compte" 
                : "Créez votre compte GesFlex"
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 border-success text-success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" name="firstName" placeholder="Votre prénom" required className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" name="lastName" placeholder="Votre nom" required className="h-12" />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre.email@exemple.com"
                required
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  required
                  className="h-12 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? "Chargement..." : (isLogin ? "Se connecter" : "S'inscrire")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
              {" "}
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                }}
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}