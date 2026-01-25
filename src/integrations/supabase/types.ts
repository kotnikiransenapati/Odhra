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
      achievements: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          access_expires_at: string | null
          admin_role_id: string | null
          created_at: string
          custom_permissions: string[] | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          notes: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_expires_at?: string | null
          admin_role_id?: string | null
          created_at?: string
          custom_permissions?: string[] | null
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          notes?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_expires_at?: string | null
          admin_role_id?: string | null
          created_at?: string
          custom_permissions?: string[] | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_admin_role_id_fkey"
            columns: ["admin_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permission_definitions: {
        Row: {
          category: Database["public"]["Enums"]["admin_permission_category"]
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          permission_key: string
          permission_name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["admin_permission_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          permission_key: string
          permission_name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["admin_permission_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          permission_key?: string
          permission_name?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean
          permissions: string[]
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean
          permissions?: string[]
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean
          permissions?: string[]
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          access_expires_at: string | null
          access_starts_at: string | null
          admin_role_id: string | null
          created_at: string
          created_by: string | null
          custom_permissions: string[] | null
          id: string
          ip_whitelist: string[] | null
          is_active: boolean
          is_owner: boolean
          last_active_at: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_starts_at?: string | null
          admin_role_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_permissions?: string[] | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean
          is_owner?: boolean
          last_active_at?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_starts_at?: string | null
          admin_role_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_permissions?: string[] | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean
          is_owner?: boolean
          last_active_at?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_admin_role_id_fkey"
            columns: ["admin_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      algolia_sync_log: {
        Row: {
          action: string
          algolia_object_id: string | null
          created_at: string
          error_message: string | null
          id: string
          product_id: string | null
          status: string
          synced_at: string | null
        }
        Insert: {
          action: string
          algolia_object_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          product_id?: string | null
          status?: string
          synced_at?: string | null
        }
        Update: {
          action?: string
          algolia_object_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          product_id?: string | null
          status?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "algolia_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_reward: number | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          points_reward?: number | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      banner_ab_analytics: {
        Row: {
          banner_id: string
          created_at: string
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
          variant: string
        }
        Insert: {
          banner_id: string
          created_at?: string
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          variant?: string
        }
        Update: {
          banner_id?: string
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string | null
          id: string
          product_id: string | null
          quantity: number
        }
        Insert: {
          bundle_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
        }
        Update: {
          bundle_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          reserved_until: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          reserved_until?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          reserved_until?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_content: {
        Row: {
          ab_enabled: boolean | null
          ab_traffic_split: number | null
          ab_variant_b_content: Json | null
          content: Json
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          starts_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          ab_enabled?: boolean | null
          ab_traffic_split?: number | null
          ab_variant_b_content?: Json | null
          content?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          starts_at?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          ab_enabled?: boolean | null
          ab_traffic_split?: number | null
          ab_variant_b_content?: Json | null
          content?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cookie_consents: {
        Row: {
          analytics_consent: boolean
          created_at: string
          functional_consent: boolean
          id: string
          marketing_consent: boolean
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analytics_consent?: boolean
          created_at?: string
          functional_consent?: boolean
          id?: string
          marketing_consent?: boolean
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analytics_consent?: boolean
          created_at?: string
          functional_consent?: boolean
          id?: string
          marketing_consent?: boolean
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          decimal_places: number
          exchange_rate: number
          is_active: boolean
          is_default: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          decimal_places?: number
          exchange_rate?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          decimal_places?: number
          exchange_rate?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          api_base_url: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          rate_card: Json | null
          supported_services: Json | null
          tracking_url_template: string | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          rate_card?: Json | null
          supported_services?: Json | null
          tracking_url_template?: string | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          rate_card?: Json | null
          supported_services?: Json | null
          tracking_url_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispute_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          dispute_id: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          dispute_id: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          dispute_id?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          dispute_number: string
          dispute_type: string
          escalated_at: string | null
          evidence_urls: string[] | null
          id: string
          order_id: string | null
          priority: string
          raised_by_id: string
          raised_by_type: string
          resolution_amount: number | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_request_id: string | null
          status: string
          sub_order_id: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          dispute_number: string
          dispute_type: string
          escalated_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          priority?: string
          raised_by_id: string
          raised_by_type: string
          resolution_amount?: number | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_request_id?: string | null
          status?: string
          sub_order_id?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          dispute_number?: string
          dispute_type?: string
          escalated_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          priority?: string
          raised_by_id?: string
          raised_by_type?: string
          resolution_amount?: number | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_request_id?: string | null
          status?: string
          sub_order_id?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          abandoned_cart_reminders: boolean
          created_at: string
          id: string
          newsletter: boolean
          order_updates: boolean
          product_recommendations: boolean
          promotional_emails: boolean
          review_reminders: boolean
          shipping_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_cart_reminders?: boolean
          created_at?: string
          id?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotional_emails?: boolean
          review_reminders?: boolean
          shipping_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_cart_reminders?: boolean
          created_at?: string
          id?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotional_emails?: boolean
          review_reminders?: boolean
          shipping_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_code: string | null
          error_level: string
          function_name: string | null
          id: string
          message: string
          metadata: Json | null
          request_id: string | null
          source: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_level?: string
          function_name?: string | null
          id?: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          source?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_level?: string
          function_name?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          source?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          settings: Json | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      flash_sale_products: {
        Row: {
          flash_price: number
          flash_sale_id: string | null
          id: string
          original_price: number
          per_user_limit: number | null
          product_id: string | null
          quantity_available: number
          quantity_sold: number
        }
        Insert: {
          flash_price: number
          flash_sale_id?: string | null
          id?: string
          original_price: number
          per_user_limit?: number | null
          product_id?: string | null
          quantity_available: number
          quantity_sold?: number
        }
        Update: {
          flash_price?: number
          flash_sale_id?: string | null
          id?: string
          original_price?: number
          per_user_limit?: number | null
          product_id?: string | null
          quantity_available?: number
          quantity_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_products_flash_sale_id_fkey"
            columns: ["flash_sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          early_access_hours: number | null
          early_access_tiers: string[] | null
          ends_at: string
          id: string
          is_active: boolean
          max_quantity_per_user: number | null
          slug: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          early_access_hours?: number | null
          early_access_tiers?: string[] | null
          ends_at: string
          id?: string
          is_active?: boolean
          max_quantity_per_user?: number | null
          slug: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          early_access_hours?: number | null
          early_access_tiers?: string[] | null
          ends_at?: string
          id?: string
          is_active?: boolean
          max_quantity_per_user?: number | null
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          id: string
          location_id: string | null
          product_id: string | null
          quantity: number
          reorder_point: number | null
          reorder_quantity: number | null
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          address: Json | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          address?: Json | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          address?: Json | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          last_checkin_at: string | null
          lifetime_points: number | null
          points: number | null
          streak_days: number | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_checkin_at?: string | null
          lifetime_points?: number | null
          points?: number | null
          streak_days?: number | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_checkin_at?: string | null
          lifetime_points?: number | null
          points?: number | null
          streak_days?: number | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          source: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          source?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          channel: string
          click_count: number
          created_at: string
          created_by: string | null
          id: string
          message: string
          name: string
          open_count: number
          scheduled_at: string | null
          segment: string
          sent_count: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          click_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          name: string
          open_count?: number
          scheduled_at?: string | null
          segment: string
          sent_count?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          click_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          name?: string
          open_count?: number
          scheduled_at?: string | null
          segment?: string
          sent_count?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_image: string | null
          product_title: string
          quantity: number
          sku: string | null
          sub_order_id: string
          total_price: number
          unit_price: number
          variant_info: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_title: string
          quantity: number
          sku?: string | null
          sub_order_id: string
          total_price: number
          unit_price: number
          variant_info?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_title?: string
          quantity?: number
          sku?: string | null
          sub_order_id?: string
          total_price?: number
          unit_price?: number
          variant_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          billing_address: Json | null
          created_at: string
          currency: string
          customer_id: string
          customer_note: string | null
          discount_amount: number | null
          exchange_rate_used: number | null
          id: string
          ip_address: string | null
          order_number: string
          original_currency: string | null
          payment_id: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          shipping_address: Json
          shipping_amount: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_note?: string | null
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_note?: string | null
          discount_amount?: number | null
          exchange_rate_used?: number | null
          id?: string
          ip_address?: string | null
          order_number: string
          original_currency?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          shipping_address: Json
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_note?: string | null
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_note?: string | null
          discount_amount?: number | null
          exchange_rate_used?: number | null
          id?: string
          ip_address?: string | null
          order_number?: string
          original_currency?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          shipping_address?: Json
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_details: Json | null
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_details?: Json | null
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_details?: Json | null
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          bundle_price: number
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          sold_count: number
          stock: number
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          bundle_price: number
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          sold_count?: number
          stock?: number
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          bundle_price?: number
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          sold_count?: number
          stock?: number
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_bundles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bundles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
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
      products: {
        Row: {
          allow_backorder: boolean | null
          avg_rating: number | null
          barcode: string | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          description_html: string | null
          dimensions: Json | null
          id: string
          is_active: boolean
          is_digital: boolean
          is_featured: boolean
          low_stock_threshold: number | null
          options: Json | null
          price: number
          review_count: number | null
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          slug: string
          sold_count: number | null
          stock: number
          tags: string[] | null
          title: string
          track_inventory: boolean | null
          updated_at: string
          variants: Json | null
          vendor_id: string
          view_count: number | null
          weight: number | null
        }
        Insert: {
          allow_backorder?: boolean | null
          avg_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          description_html?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean
          is_digital?: boolean
          is_featured?: boolean
          low_stock_threshold?: number | null
          options?: Json | null
          price: number
          review_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug: string
          sold_count?: number | null
          stock?: number
          tags?: string[] | null
          title: string
          track_inventory?: boolean | null
          updated_at?: string
          variants?: Json | null
          vendor_id: string
          view_count?: number | null
          weight?: number | null
        }
        Update: {
          allow_backorder?: boolean | null
          avg_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          description_html?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean
          is_digital?: boolean
          is_featured?: boolean
          low_stock_threshold?: number | null
          options?: Json | null
          price?: number
          review_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug?: string
          sold_count?: number | null
          stock?: number
          tags?: string[] | null
          title?: string
          track_inventory?: boolean | null
          updated_at?: string
          variants?: Json | null
          vendor_id?: string
          view_count?: number | null
          weight?: number | null
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
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_book: Json | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_2fa_enabled: boolean | null
          phone: string | null
          preferred_currency: string | null
          updated_at: string
        }
        Insert: {
          address_book?: Json | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_2fa_enabled?: boolean | null
          phone?: string | null
          preferred_currency?: string | null
          updated_at?: string
        }
        Update: {
          address_book?: Json | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          phone?: string | null
          preferred_currency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_usages: {
        Row: {
          created_at: string
          discount_applied: number
          id: string
          order_id: string | null
          promotion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_applied: number
          id?: string
          order_id?: string | null
          promotion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          promotion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usages_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          applicable_vendors: string[] | null
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          excluded_products: string[] | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          metadata: Json | null
          min_order_amount: number | null
          name: string
          per_user_limit: number | null
          starts_at: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_vendors?: string[] | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          excluded_products?: string[] | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          metadata?: Json | null
          min_order_amount?: number | null
          name: string
          per_user_limit?: number | null
          starts_at?: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_vendors?: string[] | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          excluded_products?: string[] | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          metadata?: Json | null
          min_order_amount?: number | null
          name?: string
          per_user_limit?: number | null
          starts_at?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          identifier_type?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          successful_referrals: number | null
          total_earnings: number | null
          total_referrals: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          qualifying_order_id: string | null
          referral_code: string
          referred_id: string
          referred_reward: number | null
          referrer_id: string
          referrer_reward: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          qualifying_order_id?: string | null
          referral_code: string
          referred_id: string
          referred_reward?: number | null
          referrer_id: string
          referrer_reward?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          qualifying_order_id?: string | null
          referral_code?: string
          referred_id?: string
          referred_reward?: number | null
          referrer_id?: string
          referrer_reward?: number | null
          status?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          quantity: number
          reason: string | null
          refund_amount: number | null
          return_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          quantity?: number
          reason?: string | null
          refund_amount?: number | null
          return_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
          reason?: string | null
          refund_amount?: number | null
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: string
          id: string
          images: string[] | null
          inspected_at: string | null
          inspection_notes: string | null
          inspection_result: string | null
          order_id: string
          picked_up_at: string | null
          pickup_address: Json | null
          pickup_awb: string | null
          pickup_partner_id: string | null
          pickup_scheduled_at: string | null
          received_at: string | null
          refund_amount: number | null
          refund_method: string | null
          rejected_reason: string | null
          return_number: string
          return_reason: string
          return_reason_details: string | null
          status: string
          sub_order_id: string
          updated_at: string
          vendor_id: string
          vendor_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          images?: string[] | null
          inspected_at?: string | null
          inspection_notes?: string | null
          inspection_result?: string | null
          order_id: string
          picked_up_at?: string | null
          pickup_address?: Json | null
          pickup_awb?: string | null
          pickup_partner_id?: string | null
          pickup_scheduled_at?: string | null
          received_at?: string | null
          refund_amount?: number | null
          refund_method?: string | null
          rejected_reason?: string | null
          return_number: string
          return_reason: string
          return_reason_details?: string | null
          status?: string
          sub_order_id: string
          updated_at?: string
          vendor_id: string
          vendor_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          images?: string[] | null
          inspected_at?: string | null
          inspection_notes?: string | null
          inspection_result?: string | null
          order_id?: string
          picked_up_at?: string | null
          pickup_address?: Json | null
          pickup_awb?: string | null
          pickup_partner_id?: string | null
          pickup_scheduled_at?: string | null
          received_at?: string | null
          refund_amount?: number | null
          refund_method?: string | null
          rejected_reason?: string | null
          return_number?: string
          return_reason?: string
          return_reason_details?: string | null
          status?: string
          sub_order_id?: string
          updated_at?: string
          vendor_id?: string
          vendor_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_pickup_partner_id_fkey"
            columns: ["pickup_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          helpful_count: number | null
          id: string
          images: string[] | null
          is_approved: boolean
          is_verified_purchase: boolean
          order_item_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
          vendor_replied_at: string | null
          vendor_reply: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean
          is_verified_purchase?: boolean
          order_item_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean
          is_verified_purchase?: boolean
          order_item_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          event_code: string
          event_description: string
          id: string
          location: string | null
          location_city: string | null
          location_state: string | null
          raw_data: Json | null
          shipment_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          event_code: string
          event_description: string
          id?: string
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          raw_data?: Json | null
          shipment_id: string
          timestamp: string
        }
        Update: {
          created_at?: string
          event_code?: string
          event_description?: string
          id?: string
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          raw_data?: Json | null
          shipment_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_weight: number | null
          awb_number: string | null
          courier_name: string | null
          created_at: string
          current_location: string | null
          current_status: string
          delivered_at: string | null
          delivery_attempts: number
          delivery_otp: string | null
          delivery_partner_id: string | null
          estimated_delivery_date: string | null
          id: string
          in_transit_at: string | null
          invoice_url: string | null
          out_for_delivery_at: string | null
          picked_up_at: string | null
          pickup_scheduled_at: string | null
          pod_url: string | null
          shipping_label_url: string | null
          sub_order_id: string
          updated_at: string
          volumetric_weight: number | null
        }
        Insert: {
          actual_weight?: number | null
          awb_number?: string | null
          courier_name?: string | null
          created_at?: string
          current_location?: string | null
          current_status?: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_otp?: string | null
          delivery_partner_id?: string | null
          estimated_delivery_date?: string | null
          id?: string
          in_transit_at?: string | null
          invoice_url?: string | null
          out_for_delivery_at?: string | null
          picked_up_at?: string | null
          pickup_scheduled_at?: string | null
          pod_url?: string | null
          shipping_label_url?: string | null
          sub_order_id: string
          updated_at?: string
          volumetric_weight?: number | null
        }
        Update: {
          actual_weight?: number | null
          awb_number?: string | null
          courier_name?: string | null
          created_at?: string
          current_location?: string | null
          current_status?: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_otp?: string | null
          delivery_partner_id?: string | null
          estimated_delivery_date?: string | null
          id?: string
          in_transit_at?: string | null
          invoice_url?: string | null
          out_for_delivery_at?: string | null
          picked_up_at?: string | null
          pickup_scheduled_at?: string | null
          pod_url?: string | null
          shipping_label_url?: string | null
          sub_order_id?: string
          updated_at?: string
          volumetric_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_entries: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          order_id: string | null
          promotion_id: string | null
          qualifying_order_id: string | null
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at: string
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          qualifying_order_id?: string | null
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          qualifying_order_id?: string | null
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spin_wheel_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_wheel_entries_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_wheel_entries_qualifying_order_id_fkey"
            columns: ["qualifying_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_orders: {
        Row: {
          carrier: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          return_window_ends_at: string | null
          shipped_at: string | null
          shipping_amount: number | null
          status: Database["public"]["Enums"]["order_status"]
          sub_order_number: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_earnings: number
          vendor_id: string
          vendor_note: string | null
        }
        Insert: {
          carrier?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          return_window_ends_at?: string | null
          shipped_at?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          sub_order_number: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_earnings: number
          vendor_id: string
          vendor_note?: string | null
        }
        Update: {
          carrier?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          return_window_ends_at?: string | null
          shipped_at?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          sub_order_number?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_earnings?: number
          vendor_id?: string
          vendor_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_orders: {
        Row: {
          billing_amount: number
          billing_attempt: number
          created_at: string
          failure_reason: string | null
          id: string
          next_retry_at: string | null
          order_id: string | null
          processed_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          billing_amount: number
          billing_attempt?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          order_id?: string | null
          processed_at?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          billing_amount?: number
          billing_attempt?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          order_id?: string | null
          processed_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          interval: string
          interval_count: number
          is_active: boolean
          name: string
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          interval: string
          interval_count?: number
          is_active?: boolean
          name: string
          price: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          interval?: string
          interval_count?: number
          is_active?: boolean
          name?: string
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          last_billed_at: string | null
          next_billing_date: string
          pause_until: string | null
          plan_id: string
          product_id: string
          quantity: number
          shipping_address: Json
          status: string
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          last_billed_at?: string | null
          next_billing_date: string
          pause_until?: string | null
          plan_id: string
          product_id: string
          quantity?: number
          shipping_address: Json
          status?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          last_billed_at?: string | null
          next_billing_date?: string
          pause_until?: string | null
          plan_id?: string
          product_id?: string
          quantity?: number
          shipping_address?: Json
          status?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          category: string
          created_at: string
          description: string
          id: string
          order_id: string | null
          priority: string
          product_id: string | null
          resolved_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          priority?: string
          product_id?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: string
          product_id?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tax_exemptions: {
        Row: {
          certificate_url: string | null
          created_at: string
          exemption_type: string
          gstin: string | null
          id: string
          is_verified: boolean
          user_id: string | null
          valid_from: string
          valid_until: string | null
          vendor_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          exemption_type: string
          gstin?: string | null
          id?: string
          is_verified?: boolean
          user_id?: string | null
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          exemption_type?: string
          gstin?: string | null
          id?: string
          is_verified?: boolean
          user_id?: string | null
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_exemptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_exemptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_zones: {
        Row: {
          category_overrides: Json | null
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          states: string[] | null
          tax_rates: Json
          updated_at: string
        }
        Insert: {
          category_overrides?: Json | null
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          states?: string[] | null
          tax_rates?: Json
          updated_at?: string
        }
        Update: {
          category_overrides?: Json | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          states?: string[] | null
          tax_rates?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string | null
          location: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          location?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          location?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          balance: number
          bank_details: Json | null
          banner_url: string | null
          bio: string | null
          brand_name: string
          commission_rate: number
          created_at: string
          gst_number: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string | null
          pending_balance: number
          slug: string
          social_links: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          bank_details?: Json | null
          banner_url?: string | null
          bio?: string | null
          brand_name: string
          commission_rate?: number
          created_at?: string
          gst_number?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          pending_balance?: number
          slug: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          bank_details?: Json | null
          banner_url?: string | null
          bio?: string | null
          brand_name?: string
          commission_rate?: number
          created_at?: string
          gst_number?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          pending_balance?: number
          slug?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          vendor_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          vendor_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: Json
          message_type: string
          meta_message_id: string | null
          phone_number: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content: Json
          message_type: string
          meta_message_id?: string | null
          phone_number: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: Json
          message_type?: string
          meta_message_id?: string | null
          phone_number?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_preferences: {
        Row: {
          created_at: string
          id: string
          opted_in_at: string
          opted_out_at: string | null
          order_notifications: boolean
          phone_number: string
          promotional_messages: boolean
          return_notifications: boolean
          shipping_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opted_in_at?: string
          opted_out_at?: string | null
          order_notifications?: boolean
          phone_number: string
          promotional_messages?: boolean
          return_notifications?: boolean
          shipping_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opted_in_at?: string
          opted_out_at?: string | null
          order_notifications?: boolean
          phone_number?: string
          promotional_messages?: boolean
          return_notifications?: boolean
          shipping_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          status: string
          template_id: string | null
          template_type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          status?: string
          template_id?: string | null
          template_type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          status?: string
          template_id?: string | null
          template_type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vendors_public: {
        Row: {
          banner_url: string | null
          bio: string | null
          brand_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          slug: string | null
          social_links: Json | null
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          brand_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          slug?: string | null
          social_links?: Json | null
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          brand_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          slug?: string | null
          social_links?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_loyalty_points: {
        Args: {
          p_description: string
          p_points: number
          p_reference_id?: string
          p_source: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      calculate_bundle_stock: { Args: { p_bundle_id: string }; Returns: number }
      calculate_loyalty_tier: {
        Args: { lifetime_pts: number }
        Returns: string
      }
      can_user_spin: { Args: { p_user_id: string }; Returns: Json }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      convert_currency: {
        Args: {
          p_amount: number
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      expire_spin_wheel_codes: { Args: never; Returns: number }
      generate_dispute_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      generate_return_number: { Args: never; Returns: string }
      generate_sub_order_number: {
        Args: { parent_order_number: string; vendor_index: number }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_vendor_slug: { Args: { brand_name: string }; Returns: string }
      get_admin_permissions: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promotion_usage: {
        Args: { promo_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vendor: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _new_values?: Json
          _old_values?: Json
        }
        Returns: string
      }
    }
    Enums: {
      admin_permission_category:
        | "dashboard"
        | "orders"
        | "products"
        | "vendors"
        | "customers"
        | "marketing"
        | "analytics"
        | "settings"
        | "support"
        | "finance"
        | "content"
        | "security"
      app_role: "user" | "vendor" | "admin"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "escrow"
      promotion_type:
        | "coupon"
        | "flash_sale"
        | "spin_wheel"
        | "bundle"
        | "buy_x_get_y"
      wallet_transaction_type:
        | "sale"
        | "commission"
        | "payout"
        | "refund"
        | "adjustment"
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
      admin_permission_category: [
        "dashboard",
        "orders",
        "products",
        "vendors",
        "customers",
        "marketing",
        "analytics",
        "settings",
        "support",
        "finance",
        "content",
        "security",
      ],
      app_role: ["user", "vendor", "admin"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "escrow"],
      promotion_type: [
        "coupon",
        "flash_sale",
        "spin_wheel",
        "bundle",
        "buy_x_get_y",
      ],
      wallet_transaction_type: [
        "sale",
        "commission",
        "payout",
        "refund",
        "adjustment",
      ],
    },
  },
} as const
