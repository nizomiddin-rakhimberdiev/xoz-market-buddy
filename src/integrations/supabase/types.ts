export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          cost_price_snapshot: number
          created_at: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          cost_price_snapshot: number
          created_at?: string | null
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          cost_price_snapshot?: number
          created_at?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          delivery_address_text: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"] | null
          id: string
          order_number: string
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          delivery_address_text?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"] | null
          id?: string
          order_number: string
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address_text?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"] | null
          id?: string
          order_number?: string
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_main: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_main?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_main?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          cost_price_override: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_override: number | null
          product_id: string
          sku: string | null
          stock_qty: number | null
          updated_at: string | null
        }
        Insert: {
          cost_price_override?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_price_override?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_order_qty: number | null
          name: string
          old_price: number | null
          price: number
          sku: string | null
          slug: string
          step_qty: number | null
          stock_qty: number | null
          unit: Database["public"]["Enums"]["product_unit"] | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_order_qty?: number | null
          name: string
          old_price?: number | null
          price: number
          sku?: string | null
          slug: string
          step_qty?: number | null
          stock_qty?: number | null
          unit?: Database["public"]["Enums"]["product_unit"] | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_order_qty?: number | null
          name?: string
          old_price?: number | null
          price?: number
          sku?: string | null
          slug?: string
          step_qty?: number | null
          stock_qty?: number | null
          unit?: Database["public"]["Enums"]["product_unit"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      delivery_type: "pickup" | "delivery"
      order_status: "new" | "processing" | "ready" | "delivered" | "canceled"
      payment_type: "cash" | "card" | "transfer"
      product_unit: "dona" | "kg" | "quti" | "paket"
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
      app_role: ["admin", "user"],
      delivery_type: ["pickup", "delivery"],
      order_status: ["new", "processing", "ready", "delivered", "canceled"],
      payment_type: ["cash", "card", "transfer"],
      product_unit: ["dona", "kg", "quti", "paket"],
    },
  },
} as const
