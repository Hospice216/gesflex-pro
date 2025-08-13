import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrency } from "@/hooks/useCurrency"

export function CurrencyExample() {
  const { 
    formatCurrency, 
    formatCurrencyCustom, 
    formatCurrencyWithSymbol, 
    getCurrencyInfo 
  } = useCurrency()

  const currencyInfo = getCurrencyInfo()
  const testAmount = 1234567.89

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemple d'Utilisation de la Devise</CardTitle>
        <CardDescription>
          Démonstration des différentes fonctions de formatage monétaire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Informations de Devise</h4>
            <div className="space-y-1 text-sm">
              <div>Code: <span className="font-mono">{currencyInfo.code}</span></div>
              <div>Symbole: <span className="font-mono">{currencyInfo.symbol}</span></div>
              <div>Position: <span className="font-mono">{currencyInfo.position}</span></div>
              <div>Décimales: <span className="font-mono">{currencyInfo.decimalPlaces}</span></div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Exemples de Formatage</h4>
            <div className="space-y-1 text-sm">
              <div>Standard: <span className="font-mono">{formatCurrency(testAmount)}</span></div>
              <div>Avec symbole: <span className="font-mono">{formatCurrencyWithSymbol(testAmount)}</span></div>
              <div>EUR 2 décimales: <span className="font-mono">{formatCurrencyCustom(testAmount, 'EUR', 2)}</span></div>
              <div>USD 0 décimales: <span className="font-mono">{formatCurrencyCustom(testAmount, 'USD', 0)}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Utilisation dans le Code</h4>
          <pre className="text-xs overflow-x-auto">
{`import { useCurrency } from "@/hooks/useCurrency"

function MyComponent() {
  const { formatCurrency, formatCurrencyWithSymbol } = useCurrency()
  
  return (
    <div>
      <p>Prix: {formatCurrency(1234567)}</p>
      <p>Total: {formatCurrencyWithSymbol(987654)}</p>
    </div>
  )
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
} 