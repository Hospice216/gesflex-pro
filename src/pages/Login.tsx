import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto -mt-2 mb-1">
            <img src="/logo.png" alt="GesFlex" className="w-12 h-12 mx-auto" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold text-[#1e40af]">GesFlex</CardTitle>
            <CardDescription className="text-sm">
              Votre Système de gestion d'entreprise de vente professionnel
            </CardDescription>
          </div>
          <div className="mt-2">
            <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => { setIsLogin(v === 'login'); setError(''); setSuccess('') }}>
              <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 h-10">
                <TabsTrigger value="login" className="rounded-none border-b-2 data-[state=active]:border-[#3b82f6] data-[state=inactive]:border-transparent">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-none border-b-2 data-[state=active]:border-[#3b82f6] data-[state=inactive]:border-transparent">
                  Inscription
                </TabsTrigger>
              </TabsList>
            </Tabs>
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

          <div className="mt-6 text-center space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Besoin d'assistance ?</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Email : <a href="mailto:jasmesdiamond@gmail.com" className="text-primary">jasmesdiamond@gmail.com</a>
            </div>
            <div className="text-xs text-muted-foreground">
              WhatsApp : <a href="tel:+2290197212185" className="text-primary">+229 01 97 21 21 85</a>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Pour toute assistance (problèmes de connexion, création de compte)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}