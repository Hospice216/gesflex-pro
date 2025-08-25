import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Plus, Search, Filter, MoreHorizontal, TrendingUp, DollarSign, CreditCard, Users, CalendarIcon, RefreshCw, AlertTriangle } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import SaleModal from "@/components/SaleModal"
import Breadcrumb from "@/components/Breadcrumb"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function Sales() {
  const { formatAmount } = useCurrency()
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [showReportErrorModal, setShowReportErrorModal] = useState(false)
  const [showResolveErrorModal, setShowResolveErrorModal] = useState(false)
  const [showEditSaleModal, setShowEditSaleModal] = useState(false)
  const [errorReportText, setErrorReportText] = useState("")
  const [resolveText, setResolveText] = useState("")
  const [editForm, setEditForm] = useState<{ customer_name?: string | null; customer_email?: string | null; customer_phone?: string | null; payment_method?: string; notes?: string | null }>({})
  const [editItems, setEditItems] = useState<Array<{ id: string; product_name: string; product_sku: string; quantity: number; unit_price: number; discount_reason?: string | null }>>([])
  const [taxRate, setTaxRate] = useState<number>(0)
  const [salesPage, setSalesPage] = useState(1)
  const [salesPageSize, setSalesPageSize] = useState<number | 'all'>(20)
  const [filters, setFilters] = useState({
    dateRange: null,
    store: "all",
    paymentMethod: "all",
    status: "all"
  })

  // Permissions
  const canCreateSale = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewSales = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canManageSales = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewDetails = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canPrintReceipt = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canHandleReturns = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canCancelSales = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canResolveSaleError = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canEditSaleMeta = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  
  const canManageOwnSale = (sale: any) => {
    if (!userProfile?.id) return false
    if (['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role || '')) return true
    if (userProfile.role === 'Vendeur' && sale.sold_by === userProfile.id) return true
    return false
  }

  useEffect(() => {
    if (canViewSales) {
      fetchSales()
    }
  }, [canViewSales])

  useEffect(() => {
    const fetchTaxRate = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'sales.tax_rate')
          .maybeSingle()
        if (!error && data && data.setting_value) {
          const parsed = parseFloat(String(data.setting_value))
          if (!isNaN(parsed)) setTaxRate(parsed)
        }
      } catch {}
    }
    fetchTaxRate()
  }, [])

  const handleRetry = () => {
    setError(null)
    if (canViewSales) {
    fetchSales()
    }
  }

  const validateSaleData = (sale: any): boolean => {
    if (!sale || typeof sale !== 'object') return false
    if (!sale.id || !sale.sale_code) return false
    if (!sale.total_amount || sale.total_amount < 0) return false
    if (!sale.created_at) return false
    return true
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      setError(null)

      // ✅ CORRECTION : Logique des permissions selon le rôle
      let query = supabase
        .from("sales")
        .select(`
          *,
          sale_items(id, product_name, product_sku, quantity, unit_price, total_price),
          stores(name)
        `)
        .order("created_at", { ascending: false })

      // ✅ FILTRE : Vendeurs ne voient que leurs ventes, Managers/Admins voient tout
      if (userProfile?.role === 'Vendeur') {
        query = query.eq('sold_by', userProfile.id)
      }
      // Les Managers, Admins et SuperAdmins voient toutes les ventes

      // ✅ SUPPRESSION : Plus besoin de récupérer tous les utilisateurs
      // Chaque utilisateur ne voit que ses propres données

      const { data: salesData, error } = await query

      if (error) throw error

      if (salesData && salesData.length > 0) {
        // ✅ LOGIQUE : Enrichir les données selon le rôle
        if (userProfile?.role === 'Vendeur') {
          // Vendeur : toutes ses ventes avec ses infos
          const enrichedSales = salesData.map(sale => ({
            ...sale,
            users: {
              id: userProfile.id,
              first_name: userProfile.first_name,
              last_name: userProfile.last_name,
              email: userProfile.email
            }
          }))
          setSales(enrichedSales)
        } else {
          // Manager/Admin : toutes les ventes, besoin de récupérer les infos des vendeurs
          const userIds = [...new Set(salesData.map(sale => sale.sold_by).filter(Boolean))]
          
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from("users")
              .select("id, first_name, last_name, email")
              .in("id", userIds)

            if (!usersError && usersData) {
              const usersMap = new Map(usersData.map(user => [user.id, user]))
              
              const enrichedSales = salesData.map(sale => ({
                ...sale,
                users: usersMap.get(sale.sold_by) || null
              }))
              
              setSales(enrichedSales)
            } else {
              setSales(salesData)
            }
          } else {
            setSales(salesData)
          }
        }
      } else {
        setSales([])
      }
    } catch (error) {
      console.error('Erreur chargement ventes:', error)
      setError("Impossible de charger les ventes")
      toast({
        title: "Erreur",
        description: "Impossible de charger les ventes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const hasErrorReported = (sale: any) => {
    return typeof sale?.notes === 'string' && sale.notes.includes('[ERROR]')
  }

  const handleReportError = (sale: any) => {
    setSelectedSale(sale)
    setErrorReportText("")
    setShowReportErrorModal(true)
  }

  const submitReportError = async () => {
    if (!selectedSale) return
    try {
      const reporter = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Utilisateur'
      const header = `[ERROR] Signalée par ${reporter} le ${new Date().toLocaleString('fr-FR')}\nRaison: ${errorReportText || 'Non spécifiée'}\n---\n`
      const updatedNotes = header + (selectedSale.notes || '')
      const { error } = await supabase
        .from('sales')
        .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq('id', selectedSale.id)
      if (error) throw error
      toast({ title: 'Erreur signalée', description: 'La vente a été marquée pour révision.' })
      setShowReportErrorModal(false)
      setSelectedSale(null)
      fetchSales()
    } catch (e) {
      console.error('Report error failed:', e)
      toast({ title: "Permission refusée ou erreur", description: "Impossible de signaler l'erreur.", variant: 'destructive' })
    }
  }

  const handleResolveError = (sale: any) => {
    setSelectedSale(sale)
    setResolveText("")
    setShowResolveErrorModal(true)
  }

  const submitResolveError = async () => {
    if (!selectedSale) return
    try {
      const resolver = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Admin'
      const originalNotes: string = selectedSale.notes || ''
      const resolvedNotes = originalNotes.replace('[ERROR]', '[RESOLVED]') + `\n[RESOLUTION] Par ${resolver} le ${new Date().toLocaleString('fr-FR')}\n${resolveText || ''}`
      const { error } = await supabase
        .from('sales')
        .update({ notes: resolvedNotes, updated_at: new Date().toISOString() })
        .eq('id', selectedSale.id)
      if (error) throw error
      toast({ title: 'Erreur résolue', description: 'La vente a été marquée comme résolue.' })
      setShowResolveErrorModal(false)
      setSelectedSale(null)
      fetchSales()
    } catch (e) {
      console.error('Resolve error failed:', e)
      toast({ title: 'Erreur', description: 'Impossible de marquer comme résolue.', variant: 'destructive' })
    }
  }

  const handleEditSale = (sale: any) => {
    setSelectedSale(sale)
    setEditForm({
      customer_name: sale.customer_name || '',
      customer_email: sale.customer_email || '',
      customer_phone: sale.customer_phone || '',
      payment_method: sale.payment_method || 'cash',
      notes: sale.notes || ''
    })
    const items = (sale.sale_items || []).map((it: any) => ({
      id: it.id,
      product_name: it.product_name,
      product_sku: it.product_sku,
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      discount_reason: it.discount_reason || ''
    }))
    setEditItems(items)
    setShowEditSaleModal(true)
  }

  const submitEditSale = async () => {
    if (!selectedSale) return
    try {
      // Mettre à jour les articles modifiés (prix/remise). Quantité/produit non modifiables ici
      const origItems = selectedSale.sale_items || []
      const updates = editItems.filter(ei => {
        const orig = origItems.find((o: any) => o.id === ei.id)
        if (!orig) return false
        const changedPrice = Number(orig.unit_price) !== Number(ei.unit_price)
        const changedReason = (orig.discount_reason || '') !== (ei.discount_reason || '')
        return changedPrice || changedReason
      })
      if (updates.length > 0) {
        const updateCalls = updates.map(u => {
          const newTotal = (Number(u.unit_price) || 0) * (Number(u.quantity) || 0)
          return supabase
            .from('sale_items')
            .update({ unit_price: u.unit_price, total_price: newTotal, discount_reason: u.discount_reason || null })
            .eq('id', u.id)
        })
        const results = await Promise.all(updateCalls)
        const failure = results.find(r => (r as any).error)
        if (failure && (failure as any).error) throw (failure as any).error
      }

      // Recalculer les totaux avec TVA
      const newSubtotal = editItems.reduce((sum, it) => sum + ((Number(it.unit_price) || 0) * (Number(it.quantity) || 0)), 0)
      const newTax = newSubtotal * (taxRate / 100)
      const newTotal = newSubtotal + newTax

      const payload: any = {
        customer_name: editForm.customer_name || null,
        customer_email: editForm.customer_email || null,
        customer_phone: editForm.customer_phone || null,
        payment_method: editForm.payment_method,
        notes: editForm.notes ?? null,
        subtotal: newSubtotal,
        tax_amount: newTax,
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', selectedSale.id)
      if (error) throw error
      toast({ title: 'Vente mise à jour', description: 'Les informations ont été enregistrées.' })
      setShowEditSaleModal(false)
      setSelectedSale(null)
      fetchSales()
    } catch (e) {
      console.error('Edit sale failed:', e)
      toast({ title: 'Erreur', description: "Impossible de modifier la vente.", variant: 'destructive' })
    }
  }

  const updateEditItemPrice = (id: string, value: string) => {
    const price = parseFloat(value)
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, unit_price: isNaN(price) ? 0 : price } : it))
  }

  const updateEditItemReason = (id: string, value: string) => {
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, discount_reason: value } : it))
  }

  const computeEditSubtotal = () => {
    return editItems.reduce((sum, it) => sum + ((Number(it.unit_price) || 0) * (Number(it.quantity) || 0)), 0)
  }
  const computeEditTax = () => computeEditSubtotal() * (taxRate / 100)
  const computeEditTotal = () => computeEditSubtotal() + computeEditTax()

  const handleNewSale = () => {
    if (!canCreateSale) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour créer des ventes",
        variant: "destructive",
      })
      return
    }
    setShowSaleModal(true)
  }

  const handleViewDetails = (sale: any) => {
    if (!canViewDetails) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour voir les détails",
        variant: "destructive",
      })
      return
    }
    
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }

  const handlePrintReceipt = (sale: any) => {
    if (!canPrintReceipt) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour imprimer",
        variant: "destructive",
      })
      return
    }
    
    generateAndPrintReceipt(sale)
  }

  const handleReturnExchange = (sale: any) => {
    if (!canHandleReturns && !canManageOwnSale(sale)) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour gérer les retours",
        variant: "destructive",
      })
      return
    }
    
    setSelectedSale(sale)
    setShowReturnModal(true)
  }

  const handleCancelSale = (sale: any) => {
    if (!canCancelSales && !canManageOwnSale(sale)) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour annuler les ventes",
        variant: "destructive",
      })
      return
    }
    
    setSelectedSale(sale)
    setShowCancelModal(true)
  }

  const generateAndPrintReceipt = (sale: any) => {
    try {
      const receiptContent = `
        ========================================
        RECU DE VENTE - ${sale.sale_code}
        ========================================
        
        Date: ${new Date(sale.created_at).toLocaleDateString('fr-FR')}
        Heure: ${new Date(sale.created_at).toLocaleTimeString('fr-FR')}
        
        Client: ${sale.customer_name || 'Client anonyme'}
        Magasin: ${sale.stores?.name || 'N/A'}
        Vendeur: ${sale.users ? `${sale.users.first_name || ''} ${sale.users.last_name || ''}`.trim() || sale.users.email : 'N/A'}
        
        ========================================
        PRODUITS:
        ${sale.sale_items?.map((item: any) => 
          `${item.product_name || 'Produit'} - Qty: ${item.quantity} x ${formatAmount(item.unit_price)} = ${formatAmount(item.total_price)}`
        ).join('\n') || 'Aucun détail produit'}
        ========================================
        
        TOTAL: ${formatAmount(sale.total_amount)}
        Paiement: ${getPaymentMethodLabel(sale.payment_method)}
        Statut: ${sale.status || 'completed'}
        
        ========================================
        Merci de votre achat !
        ========================================
      `
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Reçu - ${sale.sale_code}</title>
              <style>
                body { font-family: monospace; font-size: 12px; line-height: 1.4; }
                .receipt { white-space: pre-line; }
              </style>
            </head>
            <body>
              <div class="receipt">${receiptContent}</div>
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `)
        printWindow.document.close()
        
        toast({
          title: "Impression lancée",
          description: "Le reçu a été envoyé à l'imprimante",
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      toast({
        title: "Erreur d'impression",
        description: "Impossible d'imprimer le reçu",
        variant: "destructive",
      })
    }
  }

  const confirmCancelSale = async () => {
    if (!selectedSale) return
    
    try {
      const { error } = await supabase
        .from('sales')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSale.id)
      
      if (error) throw error
      
      toast({
        title: "Vente annulée",
        description: "La vente a été annulée avec succès",
      })
      
      setShowCancelModal(false)
      setSelectedSale(null)
      fetchSales()
      
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la vente",
        variant: "destructive",
      })
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "card": return <CreditCard className="w-3 h-3" />
      case "cash": return <DollarSign className="w-3 h-3" />
      case "check": return <DollarSign className="w-3 h-3" />
      case "transfer": return <DollarSign className="w-3 h-3" />
      default: return <DollarSign className="w-3 h-3" />
    }
  }

  const getProductsLabel = (sale: any) => {
    const items = sale?.sale_items || []
    if (!items.length) return "—"
    return items
      .map((it: any) => [it.product_name, it.product_sku].filter(Boolean).join(" "))
      .join(", ")
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "card": return "Carte"
      case "cash": return "Espèces"
      case "check": return "Chèque"
      case "transfer": return "Virement"
      default: return method
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Payé</Badge>
      case "pending":
        return <Badge variant="secondary">En attente</Badge>
      case "cancelled":
        return <Badge variant="destructive">Annulé</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setFilters({
      dateRange: null,
      store: "all",
      paymentMethod: "all",
      status: "all"
    })
  }

  const filteredSales = useMemo(() => {
    const validSales = sales.filter(validateSaleData)
    
    let filtered = validSales.filter(sale => 
      searchTerm === "" || 
      sale.sale_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (filters.store && filters.store !== "all") {
      filtered = filtered.filter(sale => sale.stores?.name === filters.store)
    }

    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      filtered = filtered.filter(sale => sale.payment_method === filters.paymentMethod)
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(sale => (sale.status || "completed") === filters.status)
    }

    if (filters.dateRange?.from) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at)
        return saleDate >= filters.dateRange.from
      })
    }

    if (filters.dateRange?.to) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at)
        return saleDate <= filters.dateRange.to
      })
    }

    return filtered
  }, [sales, searchTerm, filters])

  // Pagination côté client
  const salesTotalPages = salesPageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredSales.length / (salesPageSize as number)))
  const currentSalesPage = Math.min(salesPage, salesTotalPages)
  const paginatedSales = salesPageSize === 'all'
    ? filteredSales
    : filteredSales.slice(
        (currentSalesPage - 1) * (salesPageSize as number),
        currentSalesPage * (salesPageSize as number)
      )

  useEffect(() => {
    setSalesPage(1)
  }, [salesPageSize, searchTerm, filters])

  const { totalSales, averageTicket, pendingSales } = useMemo(() => {
    const total = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const average = sales.length > 0 ? total / sales.length : 0
    const pending = sales.filter(sale => sale.status === "pending").length

    return {
      totalSales: total,
      averageTicket: average,
      pendingSales: pending
    }
  }, [sales])

  const salesStats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const beforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= today && saleDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })

    const yesterdaySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= yesterday && saleDate < today
    })

    const beforeYesterdaySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= beforeYesterday && saleDate < yesterday
    })

    const monthlySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= startOfMonth
    })

    const weeklySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= startOfWeek
    })

    // ✅ CORRECTION : Calcul correct des quantités de produits vendus pour chaque période
    const todayProductsSold = todaySales.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    )
    
    const yesterdayProductsSold = yesterdaySales.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    )
    
    const beforeYesterdayProductsSold = beforeYesterdaySales.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    )
    
    const monthlyProductsSold = monthlySales.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    )
    
    const weeklyProductsSold = weeklySales.reduce((sum, sale) => 
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    )

    return {
      // ✅ CORRECTION : Chaque période a sa propre quantité de produits vendus
      todayProductsSold,
      yesterdayProductsSold,
      beforeYesterdayProductsSold,
      monthlyProductsSold,
      weeklyProductsSold,
      
      // Chiffres d'affaires
      todaySales: todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      todayCount: todaySales.length,
      monthlySales: monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      weeklySales: weeklySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      yesterdaySales: yesterdaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      beforeYesterdaySales: beforeYesterdaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    }
  }, [sales])

  const uniqueStores = useMemo(() => {
    const stores = sales.map(sale => sale.stores?.name).filter(Boolean)
    return [...new Set(stores)]
  }, [sales])

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Ventes', icon: undefined }
        ]} 
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventes</h1>
          <p className="text-muted-foreground">
            Gérez vos ventes et transactions
          </p>
        </div>
        {canCreateSale && (
          <Button onClick={handleNewSale} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle vente
        </Button>
        )}
      </div>

      {error ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Erreur de chargement</span>
            </div>
            <p className="text-sm text-destructive/80 mt-2">{error}</p>
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Ventes du jour */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                <div className="text-2xl font-bold">{salesStats.todayProductsSold}</div>
            <p className="text-xs text-muted-foreground">
              {formatAmount(salesStats.todaySales)} de chiffre d'affaires
            </p>
          </CardContent>
        </Card>
        
            

            {/* Panier moyen */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(averageTicket)}</div>
            <p className="text-xs text-muted-foreground">
                  {salesStats.todayProductsSold} produits vendus
            </p>
          </CardContent>
        </Card>

            

            {/* Total du mois */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total du mois</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(salesStats.monthlySales)}</div>
            <p className="text-xs text-muted-foreground">
                  {salesStats.monthlyProductsSold} produits vendus
            </p>
          </CardContent>
        </Card>

            {/* Total 7 derniers jours */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total 7 derniers jours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(salesStats.weeklySales)}</div>
            <p className="text-xs text-muted-foreground">
                  {salesStats.weeklyProductsSold} produits vendus
            </p>
          </CardContent>
        </Card>

            {/* Total hier */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total hier</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(salesStats.yesterdaySales)}</div>
            <p className="text-xs text-muted-foreground">
                  {salesStats.yesterdayProductsSold} produits vendus
            </p>
          </CardContent>
        </Card>

            {/* Total avant-hier */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total avant-hier</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(salesStats.beforeYesterdaySales)}</div>
            <p className="text-xs text-muted-foreground">
                  {salesStats.beforeYesterdayProductsSold} produits vendus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher une vente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Filtres</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <Calendar
                  mode="range"
                  selected={filters.dateRange}
                  onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                  locale={fr}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Magasin</label>
                <Select value={filters.store} onValueChange={(value) => setFilters(prev => ({ ...prev, store: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les magasins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les magasins</SelectItem>
                    {uniqueStores.map((store) => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1">
                  Effacer
                </Button>
                <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
                  Appliquer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Sales List */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Historique des ventes</CardTitle>
              <CardDescription>Liste de toutes vos transactions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Par page</span>
              <Select value={String(salesPageSize)} onValueChange={(v) => setSalesPageSize(v === 'all' ? 'all' : parseInt(v))}>
                <SelectTrigger className="h-8 w-[92px]">
                  <SelectValue placeholder="20" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-28 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-8 w-8 rounded"></div>
                    </div>
                  ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  {searchTerm || Object.values(filters).some(v => v !== "all" && v !== null) ? (
                    <>
                      <p className="text-muted-foreground mb-2">Aucune vente trouvée avec les critères actuels</p>
                      <p className="text-sm text-muted-foreground mb-4">Essayez de modifier vos filtres ou votre recherche</p>
                      <Button onClick={clearFilters} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Effacer les filtres
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">Aucune vente enregistrée</p>
                      {canCreateSale && (
              <Button onClick={handleNewSale} variant="outline">
                          Créer votre première vente
              </Button>
                      )}
                    </>
                  )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Magasin</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Quantité vendue</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id} className={hasErrorReported(sale) ? 'border border-red-300 bg-red-50/40' : ''}>
                        <TableCell className="font-medium">{sale.sale_code}</TableCell>
                        <TableCell>{sale.customer_name || "Client anonyme"}</TableCell>
                        <TableCell>{sale.stores?.name}</TableCell>
                        <TableCell className="font-medium">{formatAmount(sale.total_amount)}</TableCell>
                        <TableCell className="max-w-[280px] truncate flex items-center gap-2">
                          {hasErrorReported(sale) && (
                            <Badge variant="destructive">Erreur signalée</Badge>
                          )}
                          <span className="truncate">{getProductsLabel(sale)}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sale.status || "completed")}
                        </TableCell>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {sale.users ? 
                            `${sale.users.first_name || ''} ${sale.users.last_name || ''}`.trim() || 
                            sale.users.email || 
                            "Utilisateur inconnu"
                          : "Utilisateur inconnu"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sale.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintReceipt(sale)}>
                                Imprimer reçu
                              </DropdownMenuItem>
                              {!hasErrorReported(sale) && (
                                <DropdownMenuItem onClick={() => handleReportError(sale)}>
                                  Signaler une erreur
                                </DropdownMenuItem>
                              )}
                              {hasErrorReported(sale) && canResolveSaleError && (
                                <DropdownMenuItem onClick={() => handleResolveError(sale)}>
                                  Marquer comme résolue
                                </DropdownMenuItem>
                              )}
                              {canEditSaleMeta && (
                                <DropdownMenuItem onClick={() => handleEditSale(sale)}>
                                  Modifier la vente
                                </DropdownMenuItem>
                              )}
                              {(canHandleReturns || canManageOwnSale(sale)) && (
                                <DropdownMenuItem onClick={() => handleReturnExchange(sale)}>
                                  Retour/Échange
                                </DropdownMenuItem>
                              )}
                              {(canCancelSales || canManageOwnSale(sale)) && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleCancelSale(sale)}
                                >
                                  Annuler
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {paginatedSales.map((sale) => (
                  <div key={sale.id} className={`border rounded-lg p-3 ${hasErrorReported(sale) ? 'border-red-300 bg-red-50/40' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sale.sale_code}</p>
                        <p className="text-sm text-muted-foreground truncate">{sale.customer_name || "Client anonyme"}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {hasErrorReported(sale) && <Badge variant="destructive">Erreur</Badge>}
                          {getStatusBadge(sale.status || "completed")}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Magasin</span>
                        <div className="font-medium">{sale.stores?.name || '—'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Montant</span>
                        <div className="font-medium">{formatAmount(sale.total_amount)}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Produits</span>
                        <div className="font-medium truncate">{getProductsLabel(sale)}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Date</span>
                        <div className="font-medium">{new Date(sale.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendeur</span>
                        <div className="font-medium">
                          {sale.users ? 
                            `${sale.users.first_name || ''} ${sale.users.last_name || ''}`.trim() || 
                            sale.users.email || 
                            "Inconnu"
                          : "Inconnu"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Qté vendue</span>
                        <div className="font-medium">{sale.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintReceipt(sale)}>
                            Imprimer reçu
                          </DropdownMenuItem>
                          {!hasErrorReported(sale) && (
                            <DropdownMenuItem onClick={() => handleReportError(sale)}>
                              Signaler une erreur
                            </DropdownMenuItem>
                          )}
                          {hasErrorReported(sale) && canResolveSaleError && (
                            <DropdownMenuItem onClick={() => handleResolveError(sale)}>
                              Marquer comme résolue
                            </DropdownMenuItem>
                          )}
                          {canEditSaleMeta && (
                            <DropdownMenuItem onClick={() => handleEditSale(sale)}>
                              Modifier la vente
                            </DropdownMenuItem>
                          )}
                          {(canHandleReturns || canManageOwnSale(sale)) && (
                            <DropdownMenuItem onClick={() => handleReturnExchange(sale)}>
                              Retour/Échange
                            </DropdownMenuItem>
                          )}
                          {(canCancelSales || canManageOwnSale(sale)) && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancelSale(sale)}>
                              Annuler
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSalesPage <= 1 || salesPageSize === 'all'}
                  onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentSalesPage} / {salesTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSalesPage >= salesTotalPages || salesPageSize === 'all'}
                  onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </>
      )}

      <SaleModal 
        open={showSaleModal}
        onOpenChange={setShowSaleModal}
        onSuccess={fetchSales}
      />

      {/* Modale de détails de la vente */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Détails de la vente {selectedSale.sale_code}</h2>
              <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>✕</Button>
            </div>
            
            <div className="space-y-4">
              {hasErrorReported(selectedSale) && (
                <div className="p-3 border border-red-300 bg-red-50 rounded-md">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Erreur signalée</span>
                  </div>
                  <p className="text-sm text-red-700/90 mt-2 whitespace-pre-line">
                    {selectedSale.notes}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-sm text-gray-600">Code de vente</label>
                  <p className="text-lg">{selectedSale.sale_code}</p>
                </div>
                <div>
                  <label className="font-medium text-sm text-gray-600">Date</label>
                  <p className="text-lg">{new Date(selectedSale.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <label className="font-medium text-sm text-gray-600">Client</label>
                  <p className="text-lg">{selectedSale.customer_name || "Client anonyme"}</p>
                </div>
                <div>
                  <label className="font-medium text-sm text-gray-600">Magasin</label>
                  <p className="text-lg">{selectedSale.stores?.name || "N/A"}</p>
                </div>
                <div>
                  <label className="font-medium text-sm text-gray-600">Vendeur</label>
                  <p className="text-lg">
                    {selectedSale.users ? 
                      `${selectedSale.users.first_name || ''} ${selectedSale.users.last_name || ''}`.trim() || 
                      selectedSale.users.email || 
                      "Utilisateur inconnu"
                    : "Utilisateur inconnu"}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-sm text-gray-600">Statut</label>
                  <div className="mt-1">{getStatusBadge(selectedSale.status || "completed")}</div>
                </div>
              </div>

              <div>
                <label className="font-medium text-sm text-gray-600">Produits vendus</label>
                <div className="mt-2 space-y-2">
                  {selectedSale.sale_items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">Produit #{index + 1}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          Qty: {item.quantity} x {formatAmount(item.unit_price)}
                        </span>
                      </div>
                      <span className="font-bold">{formatAmount(item.total_price)}</span>
                    </div>
                  )) || <p className="text-gray-500">Aucun détail produit disponible</p>}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total</span>
                  <span>{formatAmount(selectedSale.total_amount)}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Paiement: {getPaymentMethodLabel(selectedSale.payment_method)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de retour/échange */}
      {showReturnModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Retour/Échange</h2>
              <Button variant="ghost" onClick={() => setShowReturnModal(false)}>✕</Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Vente: <span className="font-medium">{selectedSale.sale_code}</span>
              </p>
              <p className="text-gray-600">
                Client: <span className="font-medium">{selectedSale.customer_name || "Client anonyme"}</span>
              </p>
              <p className="text-gray-600">
                Montant: <span className="font-medium">{formatAmount(selectedSale.total_amount)}</span>
              </p>
              
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <p className="text-gray-600">
                  Cette fonctionnalité sera bientôt disponible pour gérer les retours et échanges.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowReturnModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation d'annulation */}
      {showCancelModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Annuler la vente</h2>
              <Button variant="ghost" onClick={() => setShowCancelModal(false)}>✕</Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center py-4">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Êtes-vous sûr de vouloir annuler cette vente ?
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Vente:</strong> {selectedSale.sale_code}<br/>
                  <strong>Client:</strong> {selectedSale.customer_name || "Client anonyme"}<br/>
                  <strong>Montant:</strong> {formatAmount(selectedSale.total_amount)}
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  ⚠️ Cette action est irréversible. La vente sera marquée comme annulée.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmCancelSale}
                className="gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Confirmer l'annulation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale: Signaler une erreur */}
      {showReportErrorModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Signaler une erreur</h2>
              <Button variant="ghost" onClick={() => setShowReportErrorModal(false)}>✕</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Vente: <span className="font-medium">{selectedSale.sale_code}</span></p>
            <Textarea
              placeholder="Décrivez l'erreur (ex: mauvais produit, mauvaise quantité, client, etc.)"
              value={errorReportText}
              onChange={(e) => setErrorReportText(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowReportErrorModal(false)}>Annuler</Button>
              <Button onClick={submitReportError}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale: Marquer comme résolue */}
      {showResolveErrorModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Résoudre l'erreur</h2>
              <Button variant="ghost" onClick={() => setShowResolveErrorModal(false)}>✕</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Vente: <span className="font-medium">{selectedSale.sale_code}</span></p>
            <Textarea
              placeholder="Note de résolution (optionnelle)"
              value={resolveText}
              onChange={(e) => setResolveText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowResolveErrorModal(false)}>Annuler</Button>
              <Button onClick={submitResolveError}>Marquer résolue</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale: Modifier vente (métadonnées) */}
      {showEditSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Modifier la vente</h2>
              <Button variant="ghost" onClick={() => setShowEditSaleModal(false)}>✕</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nom du client</label>
                <Input value={editForm.customer_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={editForm.customer_email || ''} onChange={(e) => setEditForm(prev => ({ ...prev, customer_email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <Input value={editForm.customer_phone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, customer_phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Méthode de paiement</label>
                <Select value={editForm.payment_method || ''} onValueChange={(v) => setEditForm(prev => ({ ...prev, payment_method: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={editForm.notes || ''} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} className="min-h-[120px]" />
                <p className="text-xs text-muted-foreground mt-1">Astuce: utilisez des notes claires. Les balises [ERROR] et [RESOLVED] sont gérées automatiquement par les actions.</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Articles de la vente</h3>
                <span className="text-xs text-muted-foreground">Qté/produit non éditables ici</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Qté</TableHead>
                      <TableHead>PU</TableHead>
                      <TableHead>Raison remise</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editItems.map(item => {
                      const lineTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium whitespace-nowrap">{item.product_name}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.product_sku}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input type="number" step="0.01" value={String(item.unit_price)} onChange={(e) => updateEditItemPrice(item.id, e.target.value)} />
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <Input value={item.discount_reason || ''} onChange={(e) => updateEditItemReason(item.id, e.target.value)} placeholder="Si prix inférieur" />
                          </TableCell>
                          <TableCell className="font-medium">{formatAmount(lineTotal)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between"><span>Sous-total</span><span>{formatAmount(computeEditSubtotal())}</span></div>
                <div className="flex justify-between"><span>TVA ({taxRate}%)</span><span>{formatAmount(computeEditTax())}</span></div>
                <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatAmount(computeEditTotal())}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditSaleModal(false)}>Annuler</Button>
              <Button onClick={submitEditSale}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
