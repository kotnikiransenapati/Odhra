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
      agent_csat_ratings: {
        Row: {
          agent_id: string
          created_at: string | null
          customer_id: string
          feedback: string | null
          id: string
          rating: number
          ticket_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          customer_id: string
          feedback?: string | null
          id?: string
          rating: number
          ticket_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          customer_id?: string
          feedback?: string | null
          id?: string
          rating?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_csat_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          properties: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          properties?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          properties?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
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
      canned_responses: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          shortcut: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      cart_abandonment_events: {
        Row: {
          cart_snapshot: Json
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          email_step: number | null
          id: string
          last_email_at: string | null
          recovered: boolean
          recovery_code: string | null
          recovery_url: string | null
          user_id: string
        }
        Insert: {
          cart_snapshot: Json
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          email_step?: number | null
          id?: string
          last_email_at?: string | null
          recovered?: boolean
          recovery_code?: string | null
          recovery_url?: string | null
          user_id: string
        }
        Update: {
          cart_snapshot?: Json
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          email_step?: number | null
          id?: string
          last_email_at?: string | null
          recovered?: boolean
          recovery_code?: string | null
          recovery_url?: string | null
          user_id?: string
        }
        Relationships: []
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
      chat_conversations: {
        Row: {
          assigned_agent_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          last_message_at: string | null
          priority: string | null
          resolved_at: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          last_message_at?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          last_message_at?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
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
      customer_segment_members: {
        Row: {
          added_at: string
          id: string
          metadata: Json | null
          segment_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          metadata?: Json | null
          segment_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          metadata?: Json | null
          segment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          id: string
          is_active: boolean
          last_refreshed_at: string | null
          member_count: number
          name: string
          segment_type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_refreshed_at?: string | null
          member_count?: number
          name: string
          segment_type?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_refreshed_at?: string | null
          member_count?: number
          name?: string
          segment_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_stories: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          order_id: string | null
          product_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          order_id?: string | null
          product_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          order_id?: string | null
          product_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_stories_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_stories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      email_campaign_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
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
      fraud_rules: {
        Row: {
          action: string
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          risk_score_contribution: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          action?: string
          conditions: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          risk_score_contribution?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          risk_score_contribution?: number | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          order_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          rule_id: string | null
          signal_type: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          order_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          rule_id?: string | null
          signal_type: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          order_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          rule_id?: string | null
          signal_type?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "fraud_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_stock: number
          id: string
          is_resolved: boolean
          product_id: string | null
          resolved_at: string | null
          threshold: number
          vendor_id: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_stock?: number
          id?: string
          is_resolved?: boolean
          product_id?: string | null
          resolved_at?: string | null
          threshold?: number
          vendor_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_stock?: number
          id?: string
          is_resolved?: boolean
          product_id?: string | null
          resolved_at?: string | null
          threshold?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          billing_address: Json | null
          buyer_details: Json | null
          created_at: string
          currency: string
          customer_id: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_number: string
          invoice_type: string
          issued_at: string | null
          items: Json
          notes: string | null
          order_id: string
          paid_at: string | null
          pdf_url: string | null
          seller_details: Json | null
          shipping_address: Json | null
          shipping_amount: number
          status: string
          sub_order_id: string | null
          subtotal: number
          tax_amount: number
          tax_breakdown: Json | null
          terms: string | null
          total_amount: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          buyer_details?: Json | null
          created_at?: string
          currency?: string
          customer_id: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          issued_at?: string | null
          items?: Json
          notes?: string | null
          order_id: string
          paid_at?: string | null
          pdf_url?: string | null
          seller_details?: Json | null
          shipping_address?: Json | null
          shipping_amount?: number
          status?: string
          sub_order_id?: string | null
          subtotal: number
          tax_amount?: number
          tax_breakdown?: Json | null
          terms?: string | null
          total_amount: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          buyer_details?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issued_at?: string | null
          items?: Json
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          seller_details?: Json | null
          shipping_address?: Json | null
          shipping_amount?: number
          status?: string
          sub_order_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_breakdown?: Json | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_challenges: {
        Row: {
          bonus_reward: Json | null
          challenge_type: string
          created_at: string | null
          criteria: Json
          description: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          max_completions: number | null
          points_reward: number
          starts_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          bonus_reward?: Json | null
          challenge_type: string
          created_at?: string | null
          criteria: Json
          description?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          max_completions?: number | null
          points_reward?: number
          starts_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          bonus_reward?: Json | null
          challenge_type?: string
          created_at?: string | null
          criteria?: Json
          description?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          max_completions?: number | null
          points_reward?: number
          starts_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          expiring_points: number | null
          expiry_date: string | null
          id: string
          last_checkin_at: string | null
          last_tier_upgrade_at: string | null
          lifetime_points: number | null
          points: number | null
          previous_tier: string | null
          streak_days: number | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiring_points?: number | null
          expiry_date?: string | null
          id?: string
          last_checkin_at?: string | null
          last_tier_upgrade_at?: string | null
          lifetime_points?: number | null
          points?: number | null
          previous_tier?: string | null
          streak_days?: number | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiring_points?: number | null
          expiry_date?: string | null
          id?: string
          last_checkin_at?: string | null
          last_tier_upgrade_at?: string | null
          lifetime_points?: number | null
          points?: number | null
          previous_tier?: string | null
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
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number
          file_type: string
          file_url: string
          filename: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string | null
          used_in: Json | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number
          file_type: string
          file_url: string
          filename: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          used_in?: Json | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number
          file_type?: string
          file_url?: string
          filename?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          used_in?: Json | null
          width?: number | null
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          bounce_count: number | null
          channel: string
          click_count: number
          created_at: string
          created_by: string | null
          email_subject: string | null
          email_template: string | null
          fail_count: number | null
          id: string
          message: string
          name: string
          open_count: number
          scheduled_at: string | null
          segment: string
          send_completed_at: string | null
          send_started_at: string | null
          sent_count: number
          status: string
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          bounce_count?: number | null
          channel?: string
          click_count?: number
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          email_template?: string | null
          fail_count?: number | null
          id?: string
          message: string
          name: string
          open_count?: number
          scheduled_at?: string | null
          segment: string
          send_completed_at?: string | null
          send_started_at?: string | null
          sent_count?: number
          status?: string
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          bounce_count?: number | null
          channel?: string
          click_count?: number
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          email_template?: string | null
          fail_count?: number | null
          id?: string
          message?: string
          name?: string
          open_count?: number
          scheduled_at?: string | null
          segment?: string
          send_completed_at?: string | null
          send_started_at?: string | null
          sent_count?: number
          status?: string
          title?: string
          total_recipients?: number | null
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
      order_activity_log: {
        Row: {
          activity_type: string
          actor_id: string | null
          actor_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          order_id: string
          sub_order_id: string | null
          title: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          sub_order_id?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          sub_order_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_log_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          additional_comments: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          reason_category: string
          refund_amount: number | null
          refund_status: string | null
          status: string
          sub_order_id: string | null
          updated_at: string
        }
        Insert: {
          additional_comments?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          reason_category?: string
          refund_amount?: number | null
          refund_status?: string | null
          status?: string
          sub_order_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_comments?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          reason_category?: string
          refund_amount?: number | null
          refund_status?: string | null
          status?: string
          sub_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          note_type: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          note_type?: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          note_type?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          customer_id: string | null
          customer_note: string | null
          discount_amount: number | null
          exchange_rate_used: number | null
          fraud_status: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          idempotency_key: string | null
          ip_address: string | null
          order_number: string
          original_currency: string | null
          payment_id: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          risk_score: number | null
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
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number | null
          exchange_rate_used?: number | null
          fraud_status?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          order_number: string
          original_currency?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          risk_score?: number | null
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
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number | null
          exchange_rate_used?: number | null
          fraud_status?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          order_number?: string
          original_currency?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          risk_score?: number | null
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
      payment_reconciliation: {
        Row: {
          created_at: string
          discrepancy: number | null
          gateway_amount: number
          gateway_transaction_id: string | null
          id: string
          notes: string | null
          order_amount: number
          order_id: string | null
          payment_gateway: string
          reconciled_at: string | null
          reconciled_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discrepancy?: number | null
          gateway_amount?: number
          gateway_transaction_id?: string | null
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          payment_gateway: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discrepancy?: number | null
          gateway_amount?: number
          gateway_transaction_id?: string | null
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          payment_gateway?: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      points_redemption_options: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_tier: string | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json
          updated_at: string | null
          usage_limit_per_user: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json
          updated_at?: string | null
          usage_limit_per_user?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: Json
          updated_at?: string | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      points_redemptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          option_id: string | null
          points_spent: number
          reward_code: string | null
          reward_details: Json
          status: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          option_id?: string | null
          points_spent: number
          reward_code?: string | null
          reward_details: Json
          status?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          option_id?: string | null
          points_spent?: number
          reward_code?: string | null
          reward_details?: Json
          status?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_redemptions_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "points_redemption_options"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          compare_at_price: number | null
          id: string
          price: number
          product_id: string
          recorded_at: string
        }
        Insert: {
          compare_at_price?: number | null
          id?: string
          price: number
          product_id: string
          recorded_at?: string
        }
        Update: {
          compare_at_price?: number | null
          id?: string
          price?: number
          product_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          price_adjustment: Json
          priority: number | null
          product_id: string | null
          rule_name: string
          rule_type: string
          starts_at: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          price_adjustment: Json
          priority?: number | null
          product_id?: string | null
          rule_name: string
          rule_type: string
          starts_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          price_adjustment?: Json
          priority?: number | null
          product_id?: string | null
          rule_name?: string
          rule_type?: string
          starts_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          cart_add_count: number | null
          cart_to_purchase_rate: number | null
          created_at: string | null
          id: string
          last_calculated_at: string | null
          product_id: string | null
          purchase_count: number | null
          trending_score: number | null
          updated_at: string | null
          view_count: number | null
          view_to_cart_rate: number | null
          wishlist_count: number | null
        }
        Insert: {
          cart_add_count?: number | null
          cart_to_purchase_rate?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          product_id?: string | null
          purchase_count?: number | null
          trending_score?: number | null
          updated_at?: string | null
          view_count?: number | null
          view_to_cart_rate?: number | null
          wishlist_count?: number | null
        }
        Update: {
          cart_add_count?: number | null
          cart_to_purchase_rate?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          product_id?: string | null
          purchase_count?: number | null
          trending_score?: number | null
          updated_at?: string | null
          view_count?: number | null
          view_to_cart_rate?: number | null
          wishlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_associations: {
        Row: {
          associated_product_id: string | null
          association_type: string
          created_at: string | null
          id: string
          product_id: string | null
          purchase_count: number | null
          strength: number | null
          updated_at: string | null
        }
        Insert: {
          associated_product_id?: string | null
          association_type: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_count?: number | null
          strength?: number | null
          updated_at?: string | null
        }
        Update: {
          associated_product_id?: string | null
          association_type?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_count?: number | null
          strength?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_associations_associated_product_id_fkey"
            columns: ["associated_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_associations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      product_variant_options: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number
          values: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
          values?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          option_values: Json
          price_adjustment: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          option_values?: Json
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          option_values?: Json
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
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
      product_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notified_at: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notified_at?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_waitlist_product_id_fkey"
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
          hsn_code: string | null
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
          hsn_code?: string | null
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
          hsn_code?: string | null
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
      refunds: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          items: Json | null
          order_id: string
          processed_at: string | null
          reason: string
          refund_method: string
          refund_number: string
          refund_type: string
          rejected_reason: string | null
          return_request_id: string | null
          status: string
          sub_order_id: string | null
          transaction_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          items?: Json | null
          order_id: string
          processed_at?: string | null
          reason: string
          refund_method?: string
          refund_number: string
          refund_type?: string
          rejected_reason?: string | null
          return_request_id?: string | null
          status?: string
          sub_order_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          items?: Json | null
          order_id?: string
          processed_at?: string | null
          reason?: string
          refund_method?: string
          refund_number?: string
          refund_type?: string
          rejected_reason?: string | null
          return_request_id?: string | null
          status?: string
          sub_order_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
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
          quality_score: number | null
          rating: number
          sentiment: string | null
          sentiment_flags: string[] | null
          sentiment_score: number | null
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
          quality_score?: number | null
          rating: number
          sentiment?: string | null
          sentiment_flags?: string[] | null
          sentiment_score?: number | null
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
          quality_score?: number | null
          rating?: number
          sentiment?: string | null
          sentiment_flags?: string[] | null
          sentiment_score?: number | null
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
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          filters: Json | null
          format: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_run_at: string | null
          recipients: string[]
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: string[]
          report_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_rewards: {
        Row: {
          clicks: number
          conversions: number
          created_at: string
          id: string
          platform: string
          product_id: string | null
          reward_earned: number
          share_code: string
          sharer_user_id: string
        }
        Insert: {
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          platform?: string
          product_id?: string | null
          reward_earned?: number
          share_code?: string
          sharer_user_id: string
        }
        Update: {
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          platform?: string
          product_id?: string | null
          reward_earned?: number
          share_code?: string
          sharer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_wishlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          share_code: string
          title: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          share_code: string
          title?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          share_code?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
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
      shipping_rates: {
        Row: {
          base_rate: number
          created_at: string
          delivery_partner_id: string | null
          description: string | null
          estimated_days_max: number
          estimated_days_min: number
          free_above_amount: number | null
          id: string
          is_active: boolean
          max_weight: number | null
          min_weight: number | null
          name: string
          per_kg_rate: number | null
          rate_type: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          base_rate?: number
          created_at?: string
          delivery_partner_id?: string | null
          description?: string | null
          estimated_days_max?: number
          estimated_days_min?: number
          free_above_amount?: number | null
          id?: string
          is_active?: boolean
          max_weight?: number | null
          min_weight?: number | null
          name: string
          per_kg_rate?: number | null
          rate_type?: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          delivery_partner_id?: string | null
          description?: string | null
          estimated_days_max?: number
          estimated_days_min?: number
          free_above_amount?: number | null
          id?: string
          is_active?: boolean
          max_weight?: number | null
          min_weight?: number | null
          name?: string
          per_kg_rate?: number | null
          rate_type?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          countries: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          postal_code_ranges: Json | null
          states: string[] | null
          updated_at: string
        }
        Insert: {
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          postal_code_ranges?: Json | null
          states?: string[] | null
          updated_at?: string
        }
        Update: {
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_code_ranges?: Json | null
          states?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string
          description: string | null
          escalation_hours: number
          escalation_to: string | null
          first_response_hours: number
          id: string
          is_active: boolean
          name: string
          priority: string
          resolution_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escalation_hours?: number
          escalation_to?: string | null
          first_response_hours?: number
          id?: string
          is_active?: boolean
          name: string
          priority: string
          resolution_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escalation_hours?: number
          escalation_to?: string | null
          first_response_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          priority?: string
          resolution_hours?: number
          updated_at?: string
        }
        Relationships: []
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
      story_likes: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "customer_stories"
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
          escalated_at: string | null
          escalated_to: string | null
          first_response_at: string | null
          id: string
          order_id: string | null
          priority: string
          product_id: string | null
          resolved_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          sla_breached: boolean | null
          sla_first_response_due: string | null
          sla_policy_id: string | null
          sla_resolution_due: string | null
          status: string
          subject: string
          tags: string[] | null
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
          escalated_at?: string | null
          escalated_to?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          product_id?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          sla_breached?: boolean | null
          sla_first_response_due?: string | null
          sla_policy_id?: string | null
          sla_resolution_due?: string | null
          status?: string
          subject: string
          tags?: string[] | null
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
          escalated_at?: string | null
          escalated_to?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          product_id?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          sla_breached?: boolean | null
          sla_first_response_due?: string | null
          sla_policy_id?: string | null
          sla_resolution_due?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
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
      ticket_internal_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_escalation: boolean
          note: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          note: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          note?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_internal_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          source_ticket_id: string
          target_ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          source_ticket_id: string
          target_ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          source_ticket_id?: string
          target_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_links_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_links_target_ticket_id_fkey"
            columns: ["target_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ticket_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tag_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          shortcut: string | null
          subject: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          shortcut?: string | null
          subject?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          shortcut?: string | null
          subject?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          id: string
          is_custom: boolean
          key: string
          language_code: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_custom?: boolean
          key: string
          language_code: string
          namespace?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_custom?: boolean
          key?: string
          language_code?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      url_redirects: {
        Row: {
          created_at: string
          created_by: string | null
          hit_count: number
          id: string
          is_active: boolean
          redirect_type: number
          source_path: string
          target_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path: string
          target_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path?: string
          target_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_behavior_events: {
        Row: {
          category_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          search_query: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          search_query?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          search_query?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          reward_claimed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          reward_claimed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          reward_claimed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "loyalty_challenges"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_kyc_documents: {
        Row: {
          document_number: string | null
          document_type: string
          document_url: string
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_at: string
          vendor_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_number?: string | null
          document_type: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          vendor_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_number?: string | null
          document_type?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          vendor_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kyc_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kyc_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          steps_completed: Json | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          steps_completed?: Json | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          steps_completed?: Json | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_onboarding_progress_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_onboarding_progress_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance_metrics: {
        Row: {
          avg_delivery_days: number | null
          avg_rating: number | null
          cancellation_rate: number | null
          cancelled_orders: number
          created_at: string
          delivered_orders: number
          id: string
          on_time_delivery_rate: number | null
          period: string
          response_time_hours: number | null
          return_rate: number | null
          returned_orders: number
          score: number | null
          sla_compliance_rate: number | null
          total_orders: number
          total_revenue: number
          total_reviews: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          avg_delivery_days?: number | null
          avg_rating?: number | null
          cancellation_rate?: number | null
          cancelled_orders?: number
          created_at?: string
          delivered_orders?: number
          id?: string
          on_time_delivery_rate?: number | null
          period: string
          response_time_hours?: number | null
          return_rate?: number | null
          returned_orders?: number
          score?: number | null
          sla_compliance_rate?: number | null
          total_orders?: number
          total_revenue?: number
          total_reviews?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          avg_delivery_days?: number | null
          avg_rating?: number | null
          cancellation_rate?: number | null
          cancelled_orders?: number
          created_at?: string
          delivered_orders?: number
          id?: string
          on_time_delivery_rate?: number | null
          period?: string
          response_time_hours?: number | null
          return_rate?: number | null
          returned_orders?: number
          score?: number | null
          sla_compliance_rate?: number | null
          total_orders?: number
          total_revenue?: number
          total_reviews?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_metrics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_metrics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_support_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "vendor_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_support_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_support_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
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
          kyc_status: string | null
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
          kyc_status?: string | null
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
          kyc_status?: string | null
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
      loyalty_leaderboard: {
        Row: {
          avatar_url: string | null
          badges_count: number | null
          display_name: string | null
          lifetime_points: number | null
          rank: number | null
          streak_days: number | null
          tier: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
      can_view_order_item: {
        Args: { _sub_order_id: string; _user_id: string }
        Returns: boolean
      }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_order_fraud: { Args: { p_order_id: string }; Returns: Json }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      compute_vendor_performance: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: undefined
      }
      convert_currency: {
        Args: {
          p_amount: number
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      deduct_product_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: Json
      }
      expire_spin_wheel_codes: { Args: never; Returns: number }
      generate_dispute_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      generate_refund_number: { Args: never; Returns: string }
      generate_return_number: { Args: never; Returns: string }
      generate_sub_order_number: {
        Args: { parent_order_number: string; vendor_index: number }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_vendor_slug: { Args: { brand_name: string }; Returns: string }
      generate_vendor_ticket_number: { Args: never; Returns: string }
      get_admin_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_dynamic_price: {
        Args: { p_product_id: string; p_quantity?: number; p_user_id?: string }
        Returns: Json
      }
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
      is_order_customer: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_order_vendor: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_vendor: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_active: { Args: { vendor_id: string }; Returns: boolean }
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
      app_role: "user" | "vendor" | "admin" | "cce"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "escrow"
        | "cod_pending"
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
      app_role: ["user", "vendor", "admin", "cce"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "escrow",
        "cod_pending",
      ],
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
