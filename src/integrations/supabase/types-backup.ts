export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          id: string
          store_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          expense_date: string
          id?: string
          store_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          store_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_badges: {
        Row: {
          badge_type: string | null
          condition_data: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          required_role: string | null
        }
        Insert: {
          badge_type?: string | null
          condition_data?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_role?: string | null
        }
        Update: {
          badge_type?: string | null
          condition_data?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_role?: string | null
        }
        Relationships: []
      }
      gamification_levels: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          max_points: number
          min_points: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          max_points: number
          min_points: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          max_points?: number
          min_points?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_point_rules: {
        Row: {
          condition_value: Json | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_active: boolean | null
          name: string
          points_awarded: number
          updated_at: string
        }
        Insert: {
          condition_value?: Json | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          name: string
          points_awarded: number
          updated_at?: string
        }
        Update: {
          condition_value?: Json | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points_awarded?: number
          updated_at?: string
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_trophies: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          trophy_type: string | null
        }
        Insert: {
          condition_type: string
          condition_value: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trophy_type?: string | null
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trophy_type?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_barcodes: {
        Row: {
          barcode: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alert_stock: number | null
          category_id: string
          created_at: string
          current_price: number
          description: string | null
          expiration_date: string | null
          id: string
          min_price: number
          name: string
          sku: string
          tax_rate: number | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          alert_stock?: number | null
          category_id: string
          created_at?: string
          current_price: number
          description?: string | null
          expiration_date?: string | null
          id?: string
          min_price: number
          name: string
          sku: string
          tax_rate?: number | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          alert_stock?: number | null
          category_id?: string
          created_at?: string
          current_price?: number
          description?: string | null
          expiration_date?: string | null
          id?: string
          min_price?: number
          name?: string
          sku?: string
          tax_rate?: number | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_validated: boolean | null
          product_id: string
          quantity: number
          store_id: string
          supplier_id: string
          total_amount: number
          unit_price: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validated_quantity: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_validated?: boolean | null
          product_id: string
          quantity: number
          store_id: string
          supplier_id: string
          total_amount: number
          unit_price: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_quantity?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_validated?: boolean | null
          product_id?: string
          quantity?: number
          store_id?: string
          supplier_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      returns_exchanges: {
        Row: {
          created_at: string
          id: string
          new_product_id: string | null
          new_quantity: number | null
          original_sale_code: string
          price_difference: number | null
          processed_by: string
          product_condition: Database["public"]["Enums"]["product_condition"]
          reason: string | null
          return_code: string
          returned_product_id: string
          returned_quantity: number
          sale_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_product_id?: string | null
          new_quantity?: number | null
          original_sale_code: string
          price_difference?: number | null
          processed_by: string
          product_condition: Database["public"]["Enums"]["product_condition"]
          reason?: string | null
          return_code: string
          returned_product_id: string
          returned_quantity: number
          sale_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_product_id?: string | null
          new_quantity?: number | null
          original_sale_code?: string
          price_difference?: number | null
          processed_by?: string
          product_condition?: Database["public"]["Enums"]["product_condition"]
          reason?: string | null
          return_code?: string
          returned_product_id?: string
          returned_quantity?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_exchanges_new_product_id_fkey"
            columns: ["new_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchanges_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchanges_returned_product_id_fkey"
            columns: ["returned_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchanges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount_reason: string | null
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          discount_reason?: string | null
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          discount_reason?: string | null
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_code: string
          store_id: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_code: string
          store_id: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_code?: string
          store_id?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          from_store_id: string
          id: string
          product_id: string
          quantity: number
          requested_by: string
          status: string | null
          to_store_id: string
          transfer_code: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          from_store_id: string
          id?: string
          product_id: string
          quantity: number
          requested_by: string
          status?: string | null
          to_store_id: string
          transfer_code: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          from_store_id?: string
          id?: string
          product_id?: string
          quantity?: number
          requested_by?: string
          status?: string | null
          to_store_id?: string
          transfer_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          setting_type: string
          category: string
          description: string | null
          is_required: boolean
          is_sensitive: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          setting_type: string
          category: string
          description?: string | null
          is_required?: boolean
          is_sensitive?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          setting_type?: string
          category?: string
          description?: string | null
          is_required?: boolean
          is_sensitive?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          id: string
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "gamification_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trophies: {
        Row: {
          awarded_at: string
          awarded_by: string
          id: string
          period_month: number
          period_year: number
          trophy_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by: string
          id?: string
          period_month: number
          period_year: number
          trophy_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          id?: string
          period_month?: number
          period_year?: number
          trophy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trophies_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "gamification_trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      payment_method:
        | "Especes"
        | "Carte"
        | "Mobile_Money"
        | "Virement"
        | "Cheque"
      product_condition: "Neuf" | "Bon" | "Moyen" | "Defectueux"
      user_role: "SuperAdmin" | "Admin" | "Manager" | "Vendeur"
      user_status: "pending" | "active" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      payment_method: [
        "Especes",
        "Carte",
        "Mobile_Money",
        "Virement",
        "Cheque",
      ],
      product_condition: ["Neuf", "Bon", "Moyen", "Defectueux"],
      user_role: ["SuperAdmin", "Admin", "Manager", "Vendeur"],
      user_status: ["pending", "active", "rejected"],
    },
  },
} as const
