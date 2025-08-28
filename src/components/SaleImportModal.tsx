import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { getUserAccessibleStores } from "@/lib/utils/store-permissions"
import { SearchableSelect } from "@/components/SearchableSelect"

type ImportRow = {
  product_sku: string
  quantity: number
  unit_price?: number | null
  discount_reason?: string | null
}

interface SaleImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SaleImportModal({ open, onOpenChange, onSuccess }: SaleImportModalProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()

  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [storeId, setStoreId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadStores = async () => {
      if (!userProfile?.id || !userProfile?.role) return
      const accessible = await getUserAccessibleStores(userProfile.id, userProfile.role)
      setStores((accessible || []).map(s => ({ id: s.id, name: s.name })))
    }
    if (open) {
      setRows([])
      setFileName("")
      setStoreId("")
      setPaymentMethod("")
      loadStores()
    }
  }, [open, userProfile?.id, userProfile?.role])

  const handleFile = async (file: File) => {
    setFileName(file.name)
    const text = await file.text()
    // Very simple CSV parser for expected headers
    // Headers: product_sku,quantity,unit_price,discount_reason
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) {
      setRows([])
      return
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const idxSku = header.indexOf('product_sku')
    const idxQty = header.indexOf('quantity')
    const idxUnit = header.indexOf('unit_price')
    const idxReason = header.indexOf('discount_reason')
    if (idxSku === -1 || idxQty === -1) {
      toast({ title: 'Format invalide', description: 'Entêtes requis: product_sku, quantity', variant: 'destructive' })
      return
    }
    const parsed: ImportRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length === 0 || !cols[idxSku]) continue
      const sku = String(cols[idxSku]).trim()
      const qty = parseInt(String(cols[idxQty]).trim(), 10)
      const unit = idxUnit !== -1 ? parseFloat(String(cols[idxUnit]).trim()) : NaN
      const reason = idxReason !== -1 ? String(cols[idxReason]).trim() : ''
      if (!sku || isNaN(qty) || qty <= 0) continue
      parsed.push({ product_sku: sku, quantity: qty, unit_price: isNaN(unit) ? null : unit, discount_reason: reason || null })
    }
    setRows(parsed)
  }

  const generateSaleCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `VTE${timestamp}${random}`
  }

  const handleImport = async () => {
    if (!userProfile?.id) {
      toast({ title: 'Erreur', description: 'Utilisateur invalide', variant: 'destructive' })
      return
    }
    if (!storeId || !paymentMethod) {
      toast({ title: 'Champs requis', description: 'Sélectionnez un magasin et une méthode de paiement', variant: 'destructive' })
      return
    }
    if (rows.length === 0) {
      toast({ title: 'Fichier vide', description: 'Aucune ligne valide à importer', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      // Map SKU -> product
      const skus = Array.from(new Set(rows.map(r => r.product_sku)))
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, sku, name, current_sale_price, min_sale_price')
        .in('sku', skus)
      if (prodError) throw prodError

      const skuToProduct = new Map((products || []).map(p => [p.sku, p]))

      // Build sale items
      const items = [] as Array<{ product_id: string; product_name: string; product_sku: string; quantity: number; unit_price: number; total_price: number; discount_reason?: string | null }>

      for (const r of rows) {
        const p = skuToProduct.get(r.product_sku)
        if (!p) {
          toast({ title: 'SKU introuvable', description: `Produit ${r.product_sku} ignoré`, variant: 'destructive' })
          continue
        }
        const unit = typeof r.unit_price === 'number' && !isNaN(r.unit_price) ? r.unit_price : p.current_sale_price
        items.push({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          quantity: r.quantity,
          unit_price: unit,
          total_price: unit * r.quantity,
          discount_reason: r.discount_reason || undefined,
        })
      }

      if (items.length === 0) {
        toast({ title: 'Aucun article valide', description: 'Vérifiez vos données', variant: 'destructive' })
        setLoading(false)
        return
      }

      const subtotal = items.reduce((s, it) => s + it.total_price, 0)
      const saleCode = generateSaleCode()

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_code: saleCode,
          store_id: storeId,
          payment_method: paymentMethod as any,
          total_amount: subtotal, // TVA ajoutée via d’autres flux si nécessaire
          subtotal,
          tax_amount: 0,
          sold_by: userProfile.id,
        })
        .select()
        .single()
      if (saleError) throw saleError

      const saleItems = items.map(it => ({
        sale_id: sale.id,
        ...it,
      }))
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)
      if (itemsError) throw itemsError

      toast({ title: 'Import réussi', description: `${items.length} article(s) importés` })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error('Import error:', e)
      toast({ title: 'Erreur import', description: 'Impossible de terminer l\'importation', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des articles de vente (CSV)</DialogTitle>
          <DialogDescription>
            Format: product_sku, quantity, unit_price (optionnel), discount_reason (optionnel)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Magasin *</Label>
            <SearchableSelect
              value={storeId}
              onValueChange={setStoreId}
              options={stores.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Sélectionner un magasin"
              triggerClassName="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>Méthode de paiement *</Label>
            <SearchableSelect
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              options={[
                { value: 'cash', label: 'Espèces' },
                { value: 'card', label: 'Carte bancaire' },
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'bank_transfer', label: 'Virement bancaire' },
                { value: 'check', label: 'Chèque' },
              ]}
              placeholder="Sélectionner une méthode"
              triggerClassName="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fichier CSV</Label>
          <Input type="file" accept=".csv" onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }} />
          {fileName && <div className="text-xs text-muted-foreground">{fileName}</div>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aperçu ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>PU</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.product_sku}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{typeof r.unit_price === 'number' ? r.unit_price : ''}</TableCell>
                    <TableCell>{r.discount_reason || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Annuler</Button>
          <Button onClick={handleImport} disabled={loading || !storeId || !paymentMethod || rows.length === 0} className="w-full sm:w-auto">
            Importer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SaleImportModal


