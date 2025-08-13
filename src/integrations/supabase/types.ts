// =====================================================
// GESFLEX PRO - TYPES TYPESCRIPT
// Types basés sur la nouvelle structure de base de données
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================================
// TYPES PERSONNALISÉS
// =====================================================

export type UserRole = 'SuperAdmin' | 'Admin' | 'Manager' | 'Vendeur'
export type UserStatus = 'pending' | 'active' | 'rejected'
export type ValidationStatus = 'pending' | 'validated' | 'rejected'
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer'
export type ReturnStatus = 'pending' | 'processed' | 'cancelled'
export type GamificationType = 'sales_amount' | 'sales_count' | 'holiday_sales' | 'daily_record' | 'personal_best'

// =====================================================
// TYPES DE BASE DE DONNÉES
// =====================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string
          email: string
          first_name: string
          last_name: string
          role: UserRole
          status: UserStatus
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          first_name: string
          last_name: string
          role?: UserRole
          status?: UserStatus
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: UserRole
          status?: UserStatus
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      user_stores: {
        Row: {
          id: string
          user_id: string
          store_id: string
          is_primary: boolean
          assigned_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          is_primary?: boolean
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          is_primary?: boolean
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      stores: {
        Row: {
          id: string
          name: string
          code: string
          address: string
          phone: string | null
          email: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string
          address: string
          phone?: string | null
          email?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string
          phone?: string | null
          email?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      units: {
        Row: {
          id: string
          name: string
          symbol: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      products: {
        Row: {
          id: string
          name: string
          sku: string
          description: string | null
          category_id: string
          unit_id: string
          min_sale_price: number
          current_sale_price: number
          purchase_price: number | null
          tax_rate: number
          alert_stock: number
          expiry_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sku?: string
          description?: string | null
          category_id: string
          unit_id: string
          min_sale_price: number
          current_sale_price: number
          purchase_price?: number | null
          tax_rate?: number
          alert_stock: number
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          description?: string | null
          category_id?: string
          unit_id?: string
          min_sale_price?: number
          current_sale_price?: number
          purchase_price?: number | null
          tax_rate?: number
          alert_stock?: number
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      product_stores: {
        Row: {
          id: string
          product_id: string
          store_id: string
          current_stock: number
          min_stock: number
          max_stock: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          store_id: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          store_id?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          created_at?: string
          updated_at?: string
        }
      }

      purchases: {
        Row: {
          id: string
          purchase_code: string
          store_id: string
          product_id: string
          supplier_id: string
          quantity: number
          unit_price: number
          total_amount: number
          expected_arrival_date: string | null
          status: ValidationStatus
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_code?: string
          store_id: string
          product_id: string
          supplier_id: string
          quantity: number
          unit_price: number
          total_amount?: number
          expected_arrival_date?: string | null
          status?: ValidationStatus
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_code?: string
          store_id?: string
          product_id?: string
          supplier_id?: string
          quantity?: number
          unit_price?: number
          total_amount?: number
          expected_arrival_date?: string | null
          status?: ValidationStatus
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      arrivals: {
        Row: {
          id: string
          purchase_id: string
          validated_quantity: number
          validated_by: string
          validated_at: string
          is_validated: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          validated_quantity: number
          validated_by: string
          validated_at?: string
          is_validated?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          validated_quantity?: number
          validated_by?: string
          validated_at?: string
          is_validated?: boolean
          notes?: string | null
          created_at?: string
        }
      }

      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      sales: {
        Row: {
          id: string
          sale_code: string
          store_id: string
          customer_id: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          payment_method: PaymentMethod
          subtotal: number
          tax_amount: number
          total_amount: number
          notes: string | null
          sold_by: string
          sold_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sale_code?: string
          store_id: string
          customer_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          payment_method: PaymentMethod
          subtotal: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          sold_by: string
          sold_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sale_code?: string
          store_id?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          payment_method?: PaymentMethod
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          sold_by?: string
          sold_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          product_name: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price: number
          discount_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          product_name: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price?: number
          discount_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          discount_reason?: string | null
          created_at?: string
        }
      }

      returns: {
        Row: {
          id: string
          return_code: string
          original_sale_id: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          return_reason: string | null
          return_status: ReturnStatus
          processed_by: string | null
          processed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          return_code?: string
          original_sale_id: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          return_reason?: string | null
          return_status?: ReturnStatus
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          return_code?: string
          original_sale_id?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          return_reason?: string | null
          return_status?: ReturnStatus
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      return_items: {
        Row: {
          id: string
          return_id: string
          original_sale_item_id: string
          product_id: string
          product_name: string
          product_sku: string
          returned_quantity: number
          original_unit_price: number
          original_total_price: number
          exchange_product_id: string | null
          exchange_quantity: number | null
          exchange_unit_price: number | null
          exchange_total_price: number | null
          price_difference: number
          created_at: string
        }
        Insert: {
          id?: string
          return_id: string
          original_sale_item_id: string
          product_id: string
          product_name: string
          product_sku: string
          returned_quantity: number
          original_unit_price: number
          original_total_price: number
          exchange_product_id?: string | null
          exchange_quantity?: number | null
          exchange_unit_price?: number | null
          exchange_total_price?: number | null
          price_difference?: number
          created_at?: string
        }
        Update: {
          id?: string
          return_id?: string
          original_sale_item_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string
          returned_quantity?: number
          original_unit_price?: number
          original_total_price?: number
          exchange_product_id?: string | null
          exchange_quantity?: number | null
          exchange_unit_price?: number | null
          exchange_total_price?: number | null
          price_difference?: number
          created_at?: string
        }
      }

      transfers: {
        Row: {
          id: string
          transfer_code: string
          source_store_id: string
          destination_store_id: string
          product_id: string
          quantity: number
          status: ValidationStatus
          expected_arrival_date: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transfer_code?: string
          source_store_id: string
          destination_store_id: string
          product_id: string
          quantity: number
          status?: ValidationStatus
          expected_arrival_date?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transfer_code?: string
          source_store_id?: string
          destination_store_id?: string
          product_id?: string
          quantity?: number
          status?: ValidationStatus
          expected_arrival_date?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      store_transfers: {
        Row: {
          id: string
          transfer_code: string
          source_store_id: string
          destination_store_id: string
          product_id: string
          quantity: number
          status: ValidationStatus
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transfer_code?: string
          source_store_id: string
          destination_store_id: string
          product_id: string
          quantity: number
          status?: ValidationStatus
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transfer_code?: string
          source_store_id?: string
          destination_store_id?: string
          product_id?: string
          quantity?: number
          status?: ValidationStatus
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      transfer_receptions: {
        Row: {
          id: string
          transfer_id: string
          received_quantity: number
          received_at: string
          received_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transfer_id: string
          received_quantity: number
          received_at?: string
          received_by: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transfer_id?: string
          received_quantity?: number
          received_at?: string
          received_by?: string
          notes?: string | null
          created_at?: string
        }
      }

      user_points: {
        Row: {
          id: string
          user_id: string
          points: number
          total_earned: number
          total_spent: number
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          total_earned?: number
          total_spent?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          total_earned?: number
          total_spent?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
      }

      points_history: {
        Row: {
          id: string
          user_id: string
          points_change: number
          change_type: string
          reason: string | null
          related_sale_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points_change: number
          change_type: string
          reason?: string | null
          related_sale_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points_change?: number
          change_type?: string
          reason?: string | null
          related_sale_id?: string | null
          created_at?: string
        }
      }

      trophies: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          points_reward: number
          condition_type: GamificationType
          condition_value: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          points_reward: number
          condition_type: GamificationType
          condition_value: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          points_reward?: number
          condition_type?: GamificationType
          condition_value?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          category?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      user_trophies: {
        Row: {
          id: string
          user_id: string
          trophy_id: string
          earned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trophy_id: string
          earned_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trophy_id?: string
          earned_at?: string
          created_at?: string
        }
      }

      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
          created_at?: string
        }
      }

      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          setting_type: string
          category: string
          description: string | null
          is_required: boolean
          is_public: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          setting_type: string
          category: string
          description?: string | null
          is_required?: boolean
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          setting_type?: string
          category?: string
          description?: string | null
          is_required?: boolean
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      currencies: {
        Row: {
          id: string
          code: string
          name: string
          symbol: string
          position: string
          decimal_places: number
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          symbol: string
          position: string
          decimal_places?: number
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          symbol?: string
          position?: string
          decimal_places?: number
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      expenses: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string
          amount: number
          expense_date: string
          store_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: string
          amount: number
          expense_date?: string
          store_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string
          amount?: number
          expense_date?: string
          store_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// =====================================================
// TYPES UTILITAIRES
// =====================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// =====================================================
// TYPES SPÉCIFIQUES POUR L'APPLICATION
// =====================================================

export type User = Tables<'users'>
export type UserInsert = Inserts<'users'>
export type UserUpdate = Updates<'users'>

export type Store = Tables<'stores'>
export type StoreInsert = Inserts<'stores'>
export type StoreUpdate = Updates<'stores'>

export type Product = Tables<'products'>
export type ProductInsert = Inserts<'products'>
export type ProductUpdate = Updates<'products'>

export type Sale = Tables<'sales'>
export type SaleInsert = Inserts<'sales'>
export type SaleUpdate = Updates<'sales'>

export type Purchase = Tables<'purchases'>
export type PurchaseInsert = Inserts<'purchases'>
export type PurchaseUpdate = Updates<'purchases'>

export type StoreTransfer = Tables<'store_transfers'>
export type StoreTransferInsert = Inserts<'store_transfers'>
export type StoreTransferUpdate = Updates<'store_transfers'>

export type Customer = Tables<'customers'>
export type CustomerInsert = Inserts<'customers'>
export type CustomerUpdate = Updates<'customers'>

export type Supplier = Tables<'suppliers'>
export type SupplierInsert = Inserts<'suppliers'>
export type SupplierUpdate = Updates<'suppliers'>

export type Category = Tables<'categories'>
export type CategoryInsert = Inserts<'categories'>
export type CategoryUpdate = Updates<'categories'>

export type Unit = Tables<'units'>
export type UnitInsert = Inserts<'units'>
export type UnitUpdate = Updates<'units'>

export type ProductStore = Tables<'product_stores'>
export type ProductStoreInsert = Inserts<'product_stores'>
export type ProductStoreUpdate = Updates<'product_stores'>

export type UserPoints = Tables<'user_points'>
export type UserPointsInsert = Inserts<'user_points'>
export type UserPointsUpdate = Updates<'user_points'>

export type Trophy = Tables<'trophies'>
export type TrophyInsert = Inserts<'trophies'>
export type TrophyUpdate = Updates<'trophies'>

export type Badge = Tables<'badges'>
export type BadgeInsert = Inserts<'badges'>
export type BadgeUpdate = Updates<'badges'>

export type SystemSetting = Tables<'system_settings'>
export type SystemSettingInsert = Inserts<'system_settings'>
export type SystemSettingUpdate = Updates<'system_settings'>

export type Currency = Tables<'currencies'>
export type CurrencyInsert = Inserts<'currencies'>
export type CurrencyUpdate = Updates<'currencies'>

export type Expense = Tables<'expenses'>
export type ExpenseInsert = Inserts<'expenses'>
export type ExpenseUpdate = Updates<'expenses'>

// =====================================================
// TYPES POUR LES FORMULAIRES
// =====================================================

export interface SaleFormData {
  store_id: string
  customer_data: {
    name: string
    email?: string
    phone?: string
  }
  payment_method: PaymentMethod
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    discount_reason?: string
  }>
  notes?: string
}

export interface PurchaseFormData {
  store_id: string
  product_id: string
  supplier_id: string
  quantity: number
  unit_price: number
  expected_arrival_date?: string
  notes?: string
}

export interface TransferFormData {
  source_store_id: string
  destination_store_id: string
  product_id: string
  quantity: number
  expected_arrival_date?: string
  notes?: string
}

export interface ReturnFormData {
  sale_code: string
  customer_data: {
    name: string
    email?: string
    phone?: string
  }
  items: Array<{
    original_sale_item_id: string
    product_id: string
    returned_quantity: number
    exchange_product_id?: string
    exchange_quantity?: number
  }>
  return_reason?: string
  notes?: string
}

// =====================================================
// TYPES POUR LES RAPPORTS ET ANALYTICS
// =====================================================

export interface SalesReport {
  period: string
  total_sales: number
  total_amount: number
  average_ticket: number
  top_products: Array<{
    product_name: string
    quantity_sold: number
    total_amount: number
  }>
  sales_by_store: Array<{
    store_name: string
    sales_count: number
    total_amount: number
  }>
}

export interface UserPerformanceReport {
  user_id: string
  user_name: string
  user_role: UserRole
  sales_count: number
  total_sales: number
  average_ticket: number
  points_earned: number
  trophies_count: number
  badges_count: number
}

export interface InventoryReport {
  store_id: string
  store_name: string
  low_stock_products: Array<{
    product_name: string
    current_stock: number
    alert_stock: number
  }>
  out_of_stock_products: Array<{
    product_name: string
    last_stock_date: string
  }>
  total_products: number
  total_value: number
}

// =====================================================
// TYPES POUR LES NOTIFICATIONS
// =====================================================

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  action_url?: string
}

// =====================================================
// TYPES POUR LES PERMISSIONS
// =====================================================

export interface UserPermissions {
  can_create_purchases: boolean
  can_validate_arrivals: boolean
  can_create_sales: boolean
  can_process_returns: boolean
  can_create_transfers: boolean
  can_validate_transfers: boolean
  can_manage_users: boolean
  can_manage_stores: boolean
  can_manage_products: boolean
  can_manage_suppliers: boolean
  can_manage_settings: boolean
  can_adjust_points: boolean
  can_view_analytics: boolean
  can_view_reports: boolean
}

// =====================================================
// TYPES POUR LES CODES UNIQUES
// =====================================================

export interface UniqueCode {
  type: 'sale' | 'return' | 'purchase' | 'transfer'
  code: string
  generated_at: string
}

// =====================================================
// TYPES POUR LA GAMIFICATION
// =====================================================

export interface GamificationStats {
  user_id: string
  current_level: number
  current_points: number
  points_to_next_level: number
  trophies_earned: number
  badges_earned: number
  achievements: Array<{
    type: GamificationType
    value: number
    achieved_at: string
  }>
}

// =====================================================
// TYPES POUR LA CONFIGURATION
// =====================================================

export interface SystemConfig {
  currency: {
    default: string
    symbol: string
    position: 'before' | 'after'
    decimal_places: number
  }
  sales: {
    tax_rate: number
    minimum_discount_reason: boolean
    auto_generate_codes: boolean
  }
  inventory: {
    low_stock_threshold: number
    auto_assign_products: boolean
    enable_transfers: boolean
  }
  notifications: {
    email_enabled: boolean
    sms_enabled: boolean
    low_stock_alerts: boolean
  }
  security: {
    session_timeout: number
    password_min_length: number
    require_strong_password: boolean
  }
  appearance: {
    theme: 'light' | 'dark'
    language: string
    date_format: string
  }
}
