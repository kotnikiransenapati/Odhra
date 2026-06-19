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
      admin_action_approvals: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          executed_at: string | null
          expires_at: string
          id: string
          payload: Json
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_activity_hourly: {
        Row: {
          action_category: string
          action_count: number
          admin_id: string | null
          bucket_hour: string
          created_at: string
          error_count: number
          id: string
          updated_at: string
        }
        Insert: {
          action_category?: string
          action_count?: number
          admin_id?: string | null
          bucket_hour: string
          created_at?: string
          error_count?: number
          id?: string
          updated_at?: string
        }
        Update: {
          action_category?: string
          action_count?: number
          admin_id?: string | null
          bucket_hour?: string
          created_at?: string
          error_count?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      admin_bookmarks: {
        Row: {
          admin_user_id: string
          created_at: string
          icon: string | null
          id: string
          label: string
          path: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          path: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          path?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_customer_notes: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          customer_id: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          created_at?: string
          customer_id: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      admin_feature_adoption: {
        Row: {
          admin_id: string
          created_at: string
          feature_key: string
          first_used_at: string
          id: string
          last_used_at: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          feature_key: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          feature_key?: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          updated_at?: string
          usage_count?: number
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
      admin_ip_allowlist: {
        Row: {
          cidr: unknown
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          cidr: unknown
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          cidr?: unknown
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_notification_preferences: {
        Row: {
          admin_user_id: string
          categories: string[]
          channel_email: boolean
          channel_in_app: boolean
          channel_sms: boolean
          created_at: string
          id: string
          is_active: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          severity_threshold: string
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          categories?: string[]
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity_threshold?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          categories?: string[]
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity_threshold?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_order_watchlist: {
        Row: {
          admin_user_id: string
          created_at: string
          due_at: string | null
          id: string
          order_id: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          order_id: string
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          order_id?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_order_watchlist_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      admin_saved_views: {
        Row: {
          admin_id: string
          columns: Json
          created_at: string
          description: string | null
          filters: Json
          id: string
          is_default: boolean
          is_shared: boolean
          last_used_at: string | null
          name: string
          pinned: boolean
          scope: string
          sort_config: Json
          updated_at: string
          use_count: number
        }
        Insert: {
          admin_id: string
          columns?: Json
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          is_shared?: boolean
          last_used_at?: string | null
          name: string
          pinned?: boolean
          scope: string
          sort_config?: Json
          updated_at?: string
          use_count?: number
        }
        Update: {
          admin_id?: string
          columns?: Json
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          is_shared?: boolean
          last_used_at?: string | null
          name?: string
          pinned?: boolean
          scope?: string
          sort_config?: Json
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      admin_session_activity: {
        Row: {
          admin_user_id: string
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          is_suspicious: boolean
          last_seen_at: string
          revoked_at: string | null
          revoked_by: string | null
          session_token_hash: string
          suspicious_reason: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean
          last_seen_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token_hash: string
          suspicious_reason?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean
          last_seen_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token_hash?: string
          suspicious_reason?: string | null
          updated_at?: string
          user_agent?: string | null
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
      anomaly_alert_rules: {
        Row: {
          baseline_minutes: number
          comparison: string
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          metric: string
          min_samples: number
          name: string
          notification_channels: string[]
          scope: string
          severity: string
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          baseline_minutes?: number
          comparison?: string
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          metric: string
          min_samples?: number
          name: string
          notification_channels?: string[]
          scope?: string
          severity?: string
          threshold: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          baseline_minutes?: number
          comparison?: string
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          metric?: string
          min_samples?: number
          name?: string
          notification_channels?: string[]
          scope?: string
          severity?: string
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      anomaly_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          baseline_value: number | null
          created_at: string
          details: Json
          detected_at: string
          id: string
          metric: string
          observed_value: number
          resolved_at: string | null
          rule_id: string | null
          sample_count: number
          scope: string
          severity: string
          status: string
          threshold: number
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline_value?: number | null
          created_at?: string
          details?: Json
          detected_at?: string
          id?: string
          metric: string
          observed_value: number
          resolved_at?: string | null
          rule_id?: string | null
          sample_count?: number
          scope?: string
          severity: string
          status?: string
          threshold: number
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline_value?: number | null
          created_at?: string
          details?: Json
          detected_at?: string
          id?: string
          metric?: string
          observed_value?: number
          resolved_at?: string | null
          rule_id?: string | null
          sample_count?: number
          scope?: string
          severity?: string
          status?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "anomaly_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage_events: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          latency_ms: number | null
          method: string
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          latency_ms?: number | null
          method?: string
          status_code: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          latency_ms?: number | null
          method?: string
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: unknown
          name: string
          revoked_at: string | null
          revoked_by: string | null
          scopes: string[]
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name: string
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[]
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name?: string
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[]
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      api_rate_limit_policies: {
        Row: {
          action: string
          burst_multiplier: number
          created_at: string
          created_by: string | null
          description: string | null
          endpoint_pattern: string | null
          id: string
          is_active: boolean
          max_requests: number
          name: string
          scope: string
          updated_at: string
          updated_by: string | null
          window_seconds: number
        }
        Insert: {
          action?: string
          burst_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_pattern?: string | null
          id?: string
          is_active?: boolean
          max_requests?: number
          name: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
          window_seconds?: number
        }
        Update: {
          action?: string
          burst_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_pattern?: string | null
          id?: string
          is_active?: boolean
          max_requests?: number
          name?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
          window_seconds?: number
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
      backup_snapshots: {
        Row: {
          checksum: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          id: string
          label: string
          notes: string | null
          restored_at: string | null
          restored_by: string | null
          scope: Json
          size_bytes: number | null
          snapshot_type: string
          started_at: string | null
          status: string
          storage_path: string | null
          triggered_by: string | null
        }
        Insert: {
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          label: string
          notes?: string | null
          restored_at?: string | null
          restored_by?: string | null
          scope?: Json
          size_bytes?: number | null
          snapshot_type?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          triggered_by?: string | null
        }
        Update: {
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          restored_at?: string | null
          restored_by?: string | null
          scope?: Json
          size_bytes?: number | null
          snapshot_type?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      backup_verifications: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          notes: string | null
          snapshot_id: string | null
          snapshot_label: string | null
          started_at: string | null
          status: string
          updated_at: string
          verified_by: string | null
          verified_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          notes?: string | null
          snapshot_id?: string | null
          snapshot_label?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          verified_by?: string | null
          verified_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          notes?: string | null
          snapshot_id?: string | null
          snapshot_label?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          verified_by?: string | null
          verified_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_verifications_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "backup_snapshots"
            referencedColumns: ["id"]
          },
        ]
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
      batch_stock_operations: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          items_affected: number
          notes: string | null
          operation_type: string
          performed_by: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          items_affected?: number
          notes?: string | null
          operation_type?: string
          performed_by: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          items_affected?: number
          notes?: string | null
          operation_type?: string
          performed_by?: string
        }
        Relationships: []
      }
      broadcast_banners: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          dismissible: boolean
          enabled: boolean
          ends_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          message: string
          starts_at: string
          updated_at: string
          variant: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          enabled?: boolean
          ends_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          message: string
          starts_at?: string
          updated_at?: string
          variant?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          enabled?: boolean
          ends_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          message?: string
          starts_at?: string
          updated_at?: string
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
      campaign_link_events: {
        Row: {
          created_at: string
          device_info: Json | null
          event_type: string
          id: string
          link_id: string
          metadata: Json | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          event_type: string
          id?: string
          link_id: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          event_type?: string
          id?: string
          link_id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_link_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "campaign_links"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_links: {
        Row: {
          campaign_name: string
          campaign_type: string
          click_count: number | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          personalization: Json | null
          purchase_count: number | null
          revenue_generated: number | null
          signup_count: number | null
          starts_at: string | null
          target_path: string
          updated_at: string
        }
        Insert: {
          campaign_name: string
          campaign_type: string
          click_count?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          personalization?: Json | null
          purchase_count?: number | null
          revenue_generated?: number | null
          signup_count?: number | null
          starts_at?: string | null
          target_path?: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          click_count?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          personalization?: Json | null
          purchase_count?: number | null
          revenue_generated?: number | null
          signup_count?: number | null
          starts_at?: string | null
          target_path?: string
          updated_at?: string
        }
        Relationships: []
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
      captcha_verifications: {
        Row: {
          action: string
          created_at: string
          error_codes: string[] | null
          hostname: string | null
          id: string
          ip_hash: string | null
          metadata: Json
          provider: string
          score: number | null
          success: boolean
          threshold: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_codes?: string[] | null
          hostname?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          provider?: string
          score?: number | null
          success: boolean
          threshold?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_codes?: string[] | null
          hostname?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          provider?: string
          score?: number | null
          success?: boolean
          threshold?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_abandonment_events: {
        Row: {
          ab_test_id: string | null
          ab_variant: string | null
          cart_snapshot: Json
          cart_value: number | null
          category_ids: string[] | null
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          email_step: number | null
          exit_popup_converted: boolean | null
          exit_popup_shown: boolean | null
          id: string
          last_email_at: string | null
          product_ids: string[] | null
          recovered: boolean
          recovered_at: string | null
          recovered_revenue: number | null
          recovery_channel: string | null
          recovery_code: string | null
          recovery_discount_code: string | null
          recovery_discount_value: number | null
          recovery_url: string | null
          user_id: string
          user_segment: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          ab_test_id?: string | null
          ab_variant?: string | null
          cart_snapshot: Json
          cart_value?: number | null
          category_ids?: string[] | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          email_step?: number | null
          exit_popup_converted?: boolean | null
          exit_popup_shown?: boolean | null
          id?: string
          last_email_at?: string | null
          product_ids?: string[] | null
          recovered?: boolean
          recovered_at?: string | null
          recovered_revenue?: number | null
          recovery_channel?: string | null
          recovery_code?: string | null
          recovery_discount_code?: string | null
          recovery_discount_value?: number | null
          recovery_url?: string | null
          user_id: string
          user_segment?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          ab_test_id?: string | null
          ab_variant?: string | null
          cart_snapshot?: Json
          cart_value?: number | null
          category_ids?: string[] | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          email_step?: number | null
          exit_popup_converted?: boolean | null
          exit_popup_shown?: boolean | null
          id?: string
          last_email_at?: string | null
          product_ids?: string[] | null
          recovered?: boolean
          recovered_at?: string | null
          recovered_revenue?: number | null
          recovery_channel?: string | null
          recovery_code?: string | null
          recovery_discount_code?: string | null
          recovery_discount_value?: number | null
          recovery_url?: string | null
          user_id?: string
          user_segment?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_abandonment_events_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "cart_recovery_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_ab_tests: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          recovered_a: number
          recovered_b: number
          revenue_a: number
          revenue_b: number
          total_sent_a: number
          total_sent_b: number
          traffic_split: number
          updated_at: string
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          recovered_a?: number
          recovered_b?: number
          revenue_a?: number
          revenue_b?: number
          total_sent_a?: number
          total_sent_b?: number
          traffic_split?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          recovered_a?: number
          recovered_b?: number
          revenue_a?: number
          revenue_b?: number
          total_sent_a?: number
          total_sent_b?: number
          traffic_split?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: []
      }
      cart_recovery_discount_rules: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          email_step: number | null
          escalation_enabled: boolean | null
          escalation_step_2_value: number | null
          escalation_step_3_value: number | null
          id: string
          is_active: boolean
          max_cart_value: number | null
          max_discount: number | null
          min_cart_value: number | null
          name: string
          priority: number
          times_used: number
          total_revenue_recovered: number
          updated_at: string
          user_segments: string[] | null
        }
        Insert: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          email_step?: number | null
          escalation_enabled?: boolean | null
          escalation_step_2_value?: number | null
          escalation_step_3_value?: number | null
          id?: string
          is_active?: boolean
          max_cart_value?: number | null
          max_discount?: number | null
          min_cart_value?: number | null
          name: string
          priority?: number
          times_used?: number
          total_revenue_recovered?: number
          updated_at?: string
          user_segments?: string[] | null
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          email_step?: number | null
          escalation_enabled?: boolean | null
          escalation_step_2_value?: number | null
          escalation_step_3_value?: number | null
          id?: string
          is_active?: boolean
          max_cart_value?: number | null
          max_discount?: number | null
          min_cart_value?: number | null
          name?: string
          priority?: number
          times_used?: number
          total_revenue_recovered?: number
          updated_at?: string
          user_segments?: string[] | null
        }
        Relationships: []
      }
      carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          meta: Json
          reserved_until: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          meta?: Json
          reserved_until?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          meta?: Json
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
      compliance_export_requests: {
        Row: {
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          processed_at: string | null
          reason: string | null
          request_type: string
          requested_by: string
          scopes: string[]
          status: string
          subject_email: string | null
          subject_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          request_type?: string
          requested_by: string
          scopes?: string[]
          status?: string
          subject_email?: string | null
          subject_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          request_type?: string
          requested_by?: string
          scopes?: string[]
          status?: string
          subject_email?: string | null
          subject_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_ledger: {
        Row: {
          consent_type: string
          created_at: string
          evidence: Json
          granted: boolean
          id: string
          ip_hash: string | null
          source: string
          user_agent_hash: string | null
          user_id: string | null
          version: string
          visitor_hash: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          evidence?: Json
          granted: boolean
          id?: string
          ip_hash?: string | null
          source?: string
          user_agent_hash?: string | null
          user_id?: string | null
          version?: string
          visitor_hash?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          evidence?: Json
          granted?: boolean
          id?: string
          ip_hash?: string | null
          source?: string
          user_agent_hash?: string | null
          user_id?: string | null
          version?: string
          visitor_hash?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
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
      custom_list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          note: string | null
          position: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          note?: string | null
          position?: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          note?: string | null
          position?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_lists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          is_public: boolean
          list_type: string
          name: string
          share_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_public?: boolean
          list_type?: string
          name: string
          share_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_public?: boolean
          list_type?: string
          name?: string
          share_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_broadcasts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: string
          body: string
          channel: string
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          metadata: Json
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          metadata?: Json
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          metadata?: Json
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_risk_events: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_score: number
          new_tier: string
          old_score: number | null
          old_tier: string | null
          reason: string
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_score: number
          new_tier: string
          old_score?: number | null
          old_tier?: string | null
          reason: string
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_score?: number
          new_tier?: string
          old_score?: number | null
          old_tier?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_risk_scores: {
        Row: {
          created_at: string
          factors: Json
          id: string
          last_computed_at: string
          manual_override: boolean
          override_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          last_computed_at?: string
          manual_override?: boolean
          override_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          last_computed_at?: string
          manual_override?: boolean
          override_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          tier?: string
          updated_at?: string
          user_id?: string
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
      customer_tag_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string
          file_size_bytes: number | null
          file_url: string | null
          filters: Json
          format: string
          id: string
          progress: number
          requested_by: string | null
          resource_type: string
          row_count: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json
          format?: string
          id?: string
          progress?: number
          requested_by?: string | null
          resource_type: string
          row_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json
          format?: string
          id?: string
          progress?: number
          requested_by?: string | null
          resource_type?: string
          row_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          created_at: string
          created_by: string | null
          date_column: string
          delete_mode: string
          description: string | null
          filter_expression: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_purged_count: number | null
          last_run_at: string | null
          retention_days: number
          soft_delete_column: string | null
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_column?: string
          delete_mode?: string
          description?: string | null
          filter_expression?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_purged_count?: number | null
          last_run_at?: string | null
          retention_days: number
          soft_delete_column?: string | null
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_column?: string
          delete_mode?: string
          description?: string | null
          filter_expression?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_purged_count?: number | null
          last_run_at?: string | null
          retention_days?: number
          soft_delete_column?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dead_letter_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string
          id: string
          job_type: string
          last_attempt_at: string
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          source: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message: string
          id?: string
          job_type: string
          last_attempt_at?: string
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string
          id?: string
          job_type?: string
          last_attempt_at?: string
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string | null
          status?: string
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
      edge_function_metrics: {
        Row: {
          bucket_minute: string
          created_at: string
          duration_ms: number
          error_code: string | null
          function_name: string
          id: string
          status_code: number
        }
        Insert: {
          bucket_minute?: string
          created_at?: string
          duration_ms: number
          error_code?: string | null
          function_name: string
          id?: string
          status_code: number
        }
        Update: {
          bucket_minute?: string
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          function_name?: string
          id?: string
          status_code?: number
        }
        Relationships: []
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
      email_delivery_events: {
        Row: {
          bounce_type: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          occurred_at: string
          provider: string
          provider_message_id: string | null
          recipient_domain: string | null
          recipient_hash: string
          status: string
          subject: string | null
          template: string | null
        }
        Insert: {
          bounce_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          provider?: string
          provider_message_id?: string | null
          recipient_domain?: string | null
          recipient_hash: string
          status: string
          subject?: string | null
          template?: string | null
        }
        Update: {
          bounce_type?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          provider?: string
          provider_message_id?: string | null
          recipient_domain?: string | null
          recipient_hash?: string
          status?: string
          subject?: string | null
          template?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          abandoned_cart_reminders: boolean
          created_at: string
          dnd_enabled: boolean
          id: string
          newsletter: boolean
          order_updates: boolean
          product_recommendations: boolean
          promotional_emails: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          review_reminders: boolean
          shipping_updates: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_cart_reminders?: boolean
          created_at?: string
          dnd_enabled?: boolean
          id?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotional_emails?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          review_reminders?: boolean
          shipping_updates?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_cart_reminders?: boolean
          created_at?: string
          dnd_enabled?: boolean
          id?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotional_emails?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          review_reminders?: boolean
          shipping_updates?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_suppression_list: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_event_at: string
          notes: string | null
          reason: string
          source: string | null
          suppression_count: number
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_event_at?: string
          notes?: string | null
          reason: string
          source?: string | null
          suppression_count?: number
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_event_at?: string
          notes?: string | null
          reason?: string
          source?: string | null
          suppression_count?: number
          updated_at?: string
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
      favorite_vendors: {
        Row: {
          created_at: string
          id: string
          notify_new_products: boolean
          notify_sales: boolean
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_new_products?: boolean
          notify_sales?: boolean
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_new_products?: boolean
          notify_sales?: boolean
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_rollouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          feature_flag_id: string
          id: string
          metrics_snapshot: Json
          notes: string | null
          rollback_reason: string | null
          rollout_name: string
          rollout_percentage: number
          safety_threshold: Json
          scheduled_at: string
          started_at: string | null
          status: string
          target_state: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          feature_flag_id: string
          id?: string
          metrics_snapshot?: Json
          notes?: string | null
          rollback_reason?: string | null
          rollout_name: string
          rollout_percentage?: number
          safety_threshold?: Json
          scheduled_at: string
          started_at?: string | null
          status?: string
          target_state?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          feature_flag_id?: string
          id?: string
          metrics_snapshot?: Json
          notes?: string | null
          rollback_reason?: string | null
          rollout_name?: string
          rollout_percentage?: number
          safety_threshold?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
          target_state?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_rollouts_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
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
      geo_block_rules: {
        Row: {
          active: boolean
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          mode: string
          reason: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          country_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          reason?: string | null
          scope: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          reason?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      inbound_webhook_allowlist: {
        Row: {
          active: boolean
          cidr: unknown
          created_at: string
          created_by: string | null
          endpoint_path: string | null
          expires_at: string | null
          id: string
          label: string | null
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cidr: unknown
          created_at?: string
          created_by?: string | null
          endpoint_path?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cidr?: unknown
          created_at?: string
          created_by?: string | null
          endpoint_path?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      incident_updates: {
        Row: {
          id: string
          incident_id: string
          message: string
          posted_at: string
          posted_by: string | null
          status: string
        }
        Insert: {
          id?: string
          incident_id: string
          message: string
          posted_at?: string
          posted_by?: string | null
          status: string
        }
        Update: {
          id?: string
          incident_id?: string
          message?: string
          posted_at?: string
          posted_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_services: string[]
          created_at: string
          created_by: string | null
          id: string
          impact: string
          is_public: boolean
          public_summary: string
          resolved_at: string | null
          severity: string
          source_alert_id: string | null
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_services?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          impact?: string
          is_public?: boolean
          public_summary?: string
          resolved_at?: string | null
          severity: string
          source_alert_id?: string | null
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_services?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          impact?: string
          is_public?: boolean
          public_summary?: string
          resolved_at?: string | null
          severity?: string
          source_alert_id?: string | null
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      indiapost_pincode_cache: {
        Row: {
          cached_at: string
          circle: string | null
          country: string | null
          delivery_status: string | null
          district: string | null
          division: string | null
          id: string
          is_serviceable: boolean | null
          office_name: string | null
          office_type: string | null
          pincode: string
          region: string | null
          services_available: string[] | null
          state: string | null
        }
        Insert: {
          cached_at?: string
          circle?: string | null
          country?: string | null
          delivery_status?: string | null
          district?: string | null
          division?: string | null
          id?: string
          is_serviceable?: boolean | null
          office_name?: string | null
          office_type?: string | null
          pincode: string
          region?: string | null
          services_available?: string[] | null
          state?: string | null
        }
        Update: {
          cached_at?: string
          circle?: string | null
          country?: string | null
          delivery_status?: string | null
          district?: string | null
          division?: string | null
          id?: string
          is_serviceable?: boolean | null
          office_name?: string | null
          office_type?: string | null
          pincode?: string
          region?: string | null
          services_available?: string[] | null
          state?: string | null
        }
        Relationships: []
      }
      indiapost_rate_cards: {
        Row: {
          additional_per_500g: number | null
          base_rate: number
          cod_charge: number | null
          created_at: string
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          insurance_percent: number | null
          is_active: boolean | null
          service_type: string
          updated_at: string
          weight_slab_max_grams: number
          weight_slab_min_grams: number
          zone: string | null
        }
        Insert: {
          additional_per_500g?: number | null
          base_rate: number
          cod_charge?: number | null
          created_at?: string
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          insurance_percent?: number | null
          is_active?: boolean | null
          service_type: string
          updated_at?: string
          weight_slab_max_grams?: number
          weight_slab_min_grams?: number
          zone?: string | null
        }
        Update: {
          additional_per_500g?: number | null
          base_rate?: number
          cod_charge?: number | null
          created_at?: string
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          insurance_percent?: number | null
          is_active?: boolean | null
          service_type?: string
          updated_at?: string
          weight_slab_max_grams?: number
          weight_slab_min_grams?: number
          zone?: string | null
        }
        Relationships: []
      }
      indiapost_shipments: {
        Row: {
          article_type: string | null
          booking_date: string | null
          cod_amount: number | null
          consignment_number: string
          created_at: string
          current_location: string | null
          current_status: string | null
          declared_value: number | null
          delivered_at: string | null
          destination_pincode: string | null
          expected_delivery_date: string | null
          id: string
          last_tracked_at: string | null
          order_id: string | null
          origin_pincode: string | null
          raw_api_response: Json | null
          receiver_name: string | null
          receiver_pincode: string | null
          sender_name: string | null
          sender_pincode: string | null
          sub_order_id: string | null
          tracking_events: Json | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          article_type?: string | null
          booking_date?: string | null
          cod_amount?: number | null
          consignment_number: string
          created_at?: string
          current_location?: string | null
          current_status?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          destination_pincode?: string | null
          expected_delivery_date?: string | null
          id?: string
          last_tracked_at?: string | null
          order_id?: string | null
          origin_pincode?: string | null
          raw_api_response?: Json | null
          receiver_name?: string | null
          receiver_pincode?: string | null
          sender_name?: string | null
          sender_pincode?: string | null
          sub_order_id?: string | null
          tracking_events?: Json | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          article_type?: string | null
          booking_date?: string | null
          cod_amount?: number | null
          consignment_number?: string
          created_at?: string
          current_location?: string | null
          current_status?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          destination_pincode?: string | null
          expected_delivery_date?: string | null
          id?: string
          last_tracked_at?: string | null
          order_id?: string | null
          origin_pincode?: string | null
          raw_api_response?: Json | null
          receiver_name?: string | null
          receiver_pincode?: string | null
          sender_name?: string | null
          sender_pincode?: string | null
          sub_order_id?: string | null
          tracking_events?: Json | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indiapost_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indiapost_shipments_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      indiapost_zones: {
        Row: {
          created_at: string
          destination_prefix: string
          id: string
          origin_prefix: string
          zone: string
        }
        Insert: {
          created_at?: string
          destination_prefix: string
          id?: string
          origin_prefix: string
          zone: string
        }
        Update: {
          created_at?: string
          destination_prefix?: string
          id?: string
          origin_prefix?: string
          zone?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          id: string
          integration_key: string
          integration_name: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_key: string
          integration_name: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_key?: string
          integration_name?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
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
      inventory_forecasts: {
        Row: {
          avg_daily_sales: number
          computed_at: string
          confidence_score: number | null
          days_until_stockout: number | null
          id: string
          period_days: number | null
          product_id: string | null
          recommended_reorder_qty: number | null
          sales_trend: string | null
        }
        Insert: {
          avg_daily_sales?: number
          computed_at?: string
          confidence_score?: number | null
          days_until_stockout?: number | null
          id?: string
          period_days?: number | null
          product_id?: string | null
          recommended_reorder_qty?: number | null
          sales_trend?: string | null
        }
        Update: {
          avg_daily_sales?: number
          computed_at?: string
          confidence_score?: number | null
          days_until_stockout?: number | null
          id?: string
          period_days?: number | null
          product_id?: string | null
          recommended_reorder_qty?: number | null
          sales_trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      kill_switches: {
        Row: {
          category: string
          created_at: string
          description: string | null
          is_enabled: boolean
          key: string
          label: string
          reason: string | null
          toggled_at: string
          toggled_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          is_enabled?: boolean
          key: string
          label: string
          reason?: string | null
          toggled_at?: string
          toggled_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          is_enabled?: boolean
          key?: string
          label?: string
          reason?: string | null
          toggled_at?: string
          toggled_by?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email_hash: string | null
          failure_reason: string | null
          id: string
          ip_hash: string | null
          ip_inet: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email_hash?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          ip_inet?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email_hash?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          ip_inet?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      login_lockouts: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          identifier_hash: string
          identifier_label: string | null
          identifier_type: string
          locked_until: string
          reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier_hash: string
          identifier_label?: string | null
          identifier_type: string
          locked_until: string
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier_hash?: string
          identifier_label?: string | null
          identifier_type?: string
          locked_until?: string
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: []
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
      maintenance_windows: {
        Row: {
          allow_admins: boolean
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          reason: string
          scope: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          allow_admins?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason: string
          scope?: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          allow_admins?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason?: string
          scope?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      managed_secrets: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          last_rotated_at: string | null
          name: string
          notes: string | null
          owner_email: string | null
          rotation_count: number
          rotation_interval_days: number
          severity: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          name: string
          notes?: string | null
          owner_email?: string | null
          rotation_count?: number
          rotation_interval_days?: number
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          name?: string
          notes?: string | null
          owner_email?: string | null
          rotation_count?: number
          rotation_interval_days?: number
          severity?: string
          updated_at?: string
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
      mutation_idempotency: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          http_status: number | null
          id: string
          idempotency_key: string
          request_hash: string | null
          response: Json | null
          scope: string
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          http_status?: number | null
          id?: string
          idempotency_key: string
          request_hash?: string | null
          response?: Json | null
          scope: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          http_status?: number | null
          id?: string
          idempotency_key?: string
          request_hash?: string | null
          response?: Json | null
          scope?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
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
      notification_templates: {
        Row: {
          body: string
          channel: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          locale: string
          name: string
          subject: string | null
          updated_at: string
          variables: Json
          version: number
        }
        Insert: {
          body: string
          channel: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          name: string
          subject?: string | null
          updated_at?: string
          variables?: Json
          version?: number
        }
        Update: {
          body?: string
          channel?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
          version?: number
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
      order_holds: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string
          placed_by: string | null
          reason_code: string
          reason_notes: string | null
          release_notes: string | null
          released_at: string | null
          released_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          placed_by?: string | null
          reason_code: string
          reason_notes?: string | null
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          placed_by?: string | null
          reason_code?: string
          reason_notes?: string | null
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_note_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          last_used_at: string | null
          title: string
          updated_at: string
          use_count: number
          variables: Json
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          last_used_at?: string | null
          title: string
          updated_at?: string
          use_count?: number
          variables?: Json
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          last_used_at?: string | null
          title?: string
          updated_at?: string
          use_count?: number
          variables?: Json
        }
        Relationships: []
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
      order_sla_breaches: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          assigned_to: string | null
          breach_type: string
          created_at: string
          detected_at: string
          hours_overdue: number
          id: string
          metadata: Json
          order_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_to?: string | null
          breach_type?: string
          created_at?: string
          detected_at?: string
          hours_overdue?: number
          id?: string
          metadata?: Json
          order_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_to?: string | null
          breach_type?: string
          created_at?: string
          detected_at?: string
          hours_overdue?: number
          id?: string
          metadata?: Json
          order_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          order_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          order_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          order_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tag_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "order_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          label: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
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
          gift_message: string | null
          gift_recipient_name: string | null
          gift_wrap_fee: number
          guest_email: string | null
          guest_phone: string | null
          id: string
          idempotency_key: string | null
          ip_address: string | null
          is_gift: boolean
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
          gift_message?: string | null
          gift_recipient_name?: string | null
          gift_wrap_fee?: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          is_gift?: boolean
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
          gift_message?: string | null
          gift_recipient_name?: string | null
          gift_wrap_fee?: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          is_gift?: boolean
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
      outbound_circuit_breakers: {
        Row: {
          category: string
          cooldown_seconds: number
          created_at: string
          failure_count: number
          failure_threshold: number
          label: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          opened_until: string | null
          service_key: string
          state: string
          success_count: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          cooldown_seconds?: number
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          label: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_until?: string | null
          service_key: string
          state?: string
          success_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          cooldown_seconds?: number
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          label?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_until?: string | null
          service_key?: string
          state?: string
          success_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      outbound_webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          duration_ms: number | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          subscription_id: string
          success: boolean
        }
        Insert: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          status_code?: number | null
          subscription_id: string
          success?: boolean
        }
        Update: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          subscription_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "outbound_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "outbound_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_webhook_subscriptions: {
        Row: {
          consecutive_failures: number
          created_at: string
          created_by: string | null
          description: string | null
          event_types: string[]
          headers: Json
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_delivery_status: string | null
          max_retries: number
          name: string
          secret: string
          target_url: string
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[]
          headers?: Json
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          max_retries?: number
          name: string
          secret: string
          target_url: string
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[]
          headers?: Json
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          max_retries?: number
          name?: string
          secret?: string
          target_url?: string
          timeout_ms?: number
          updated_at?: string
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
      price_watches: {
        Row: {
          baseline_price: number
          created_at: string
          id: string
          notified_at: string | null
          notified_price: number | null
          product_id: string
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_price: number
          created_at?: string
          id?: string
          notified_at?: string | null
          notified_price?: number | null
          product_id: string
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_price?: number
          created_at?: string
          id?: string
          notified_at?: string | null
          notified_price?: number | null
          product_id?: string
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_watches_product_id_fkey"
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
      product_abandonment_stats: {
        Row: {
          avg_cart_value: number
          id: string
          lost_revenue: number
          period_end: string
          period_start: string
          product_id: string | null
          recovered_revenue: number
          recovery_rate: number
          times_abandoned: number
          times_recovered: number
          updated_at: string
        }
        Insert: {
          avg_cart_value?: number
          id?: string
          lost_revenue?: number
          period_end: string
          period_start: string
          product_id?: string | null
          recovered_revenue?: number
          recovery_rate?: number
          times_abandoned?: number
          times_recovered?: number
          updated_at?: string
        }
        Update: {
          avg_cart_value?: number
          id?: string
          lost_revenue?: number
          period_end?: string
          period_start?: string
          product_id?: string | null
          recovered_revenue?: number
          recovery_rate?: number
          times_abandoned?: number
          times_recovered?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_abandonment_stats_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      product_answers: {
        Row: {
          answer: string
          created_at: string
          helpful_count: number
          id: string
          is_vendor: boolean
          question_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_vendor?: boolean
          question_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_vendor?: boolean
          question_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "product_questions"
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
      product_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          pinned: boolean
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          pinned?: boolean
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          pinned?: boolean
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_notes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer_count: number
          created_at: string
          id: string
          is_anonymous: boolean
          is_answered: boolean
          product_id: string
          question: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_count?: number
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_answered?: boolean
          product_id: string
          question: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_count?: number
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_answered?: boolean
          product_id?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
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
          avg_daily_sales: number | null
          avg_rating: number | null
          barcode: string | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          days_until_stockout: number | null
          description: string | null
          description_html: string | null
          dimensions: Json | null
          hsn_code: string | null
          id: string
          is_active: boolean
          is_digital: boolean
          is_featured: boolean
          last_restock_at: string | null
          low_stock_threshold: number | null
          options: Json | null
          price: number
          reorder_point: number | null
          reorder_quantity: number | null
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
          avg_daily_sales?: number | null
          avg_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          days_until_stockout?: number | null
          description?: string | null
          description_html?: string | null
          dimensions?: Json | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_digital?: boolean
          is_featured?: boolean
          last_restock_at?: string | null
          low_stock_threshold?: number | null
          options?: Json | null
          price: number
          reorder_point?: number | null
          reorder_quantity?: number | null
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
          avg_daily_sales?: number | null
          avg_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          days_until_stockout?: number | null
          description?: string | null
          description_html?: string | null
          dimensions?: Json | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_digital?: boolean
          is_featured?: boolean
          last_restock_at?: string | null
          low_stock_threshold?: number | null
          options?: Json | null
          price?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
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
          anniversary: string | null
          anniversary_md: string | null
          avatar_url: string | null
          birthday: string | null
          birthday_md: string | null
          created_at: string
          dates_reminders_enabled: boolean
          delivery_instructions: string | null
          email: string
          full_name: string | null
          id: string
          is_2fa_enabled: boolean | null
          leave_unattended: boolean
          phone: string | null
          preferred_currency: string | null
          preferred_delivery_window: string
          updated_at: string
        }
        Insert: {
          address_book?: Json | null
          anniversary?: string | null
          anniversary_md?: string | null
          avatar_url?: string | null
          birthday?: string | null
          birthday_md?: string | null
          created_at?: string
          dates_reminders_enabled?: boolean
          delivery_instructions?: string | null
          email: string
          full_name?: string | null
          id: string
          is_2fa_enabled?: boolean | null
          leave_unattended?: boolean
          phone?: string | null
          preferred_currency?: string | null
          preferred_delivery_window?: string
          updated_at?: string
        }
        Update: {
          address_book?: Json | null
          anniversary?: string | null
          anniversary_md?: string | null
          avatar_url?: string | null
          birthday?: string | null
          birthday_md?: string | null
          created_at?: string
          dates_reminders_enabled?: boolean
          delivery_instructions?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          leave_unattended?: boolean
          phone?: string | null
          preferred_currency?: string | null
          preferred_delivery_window?: string
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
      push_delivery_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          occurred_at: string
          payload_size_bytes: number | null
          platform: string | null
          provider: string | null
          status: string
          subscription_id: string | null
          template_key: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          occurred_at?: string
          payload_size_bytes?: number | null
          platform?: string | null
          provider?: string | null
          status: string
          subscription_id?: string | null
          template_key?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          occurred_at?: string
          payload_size_bytes?: number | null
          platform?: string | null
          provider?: string | null
          status?: string
          subscription_id?: string | null
          template_key?: string | null
          user_id?: string | null
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
      recently_viewed_products: {
        Row: {
          id: string
          product_id: string
          source: string | null
          user_id: string
          view_count: number
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          source?: string | null
          user_id: string
          view_count?: number
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          source?: string | null
          user_id?: string
          view_count?: number
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      refund_approval_requests: {
        Row: {
          amount: number
          created_at: string
          decision_note: string | null
          id: string
          metadata: Json
          order_id: string
          priority: string
          reason: string
          refund_id: string | null
          requested_by: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          decision_note?: string | null
          id?: string
          metadata?: Json
          order_id: string
          priority?: string
          reason: string
          refund_id?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          decision_note?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          priority?: string
          reason?: string
          refund_id?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          auto_processed: boolean | null
          completed_at: string | null
          created_at: string
          credit_note_number: string | null
          currency: string
          customer_id: string
          gateway_response: Json | null
          gateway_status: string | null
          id: string
          items: Json | null
          order_id: string
          processed_at: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          reason: string
          refund_method: string
          refund_number: string
          refund_type: string
          rejected_reason: string | null
          return_request_id: string | null
          sla_deadline: string | null
          speed: string | null
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
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string
          credit_note_number?: string | null
          currency?: string
          customer_id: string
          gateway_response?: Json | null
          gateway_status?: string | null
          id?: string
          items?: Json | null
          order_id: string
          processed_at?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          reason: string
          refund_method?: string
          refund_number?: string
          refund_type?: string
          rejected_reason?: string | null
          return_request_id?: string | null
          sla_deadline?: string | null
          speed?: string | null
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
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string
          credit_note_number?: string | null
          currency?: string
          customer_id?: string
          gateway_response?: Json | null
          gateway_status?: string | null
          id?: string
          items?: Json | null
          order_id?: string
          processed_at?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          reason?: string
          refund_method?: string
          refund_number?: string
          refund_type?: string
          rejected_reason?: string | null
          return_request_id?: string | null
          sla_deadline?: string | null
          speed?: string | null
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
      release_notes: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          version: string | null
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      reorder_reminders: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          interval_days: number
          last_reminded_at: string | null
          next_remind_at: string
          notes: string | null
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          interval_days?: number
          last_reminded_at?: string | null
          next_remind_at?: string
          notes?: string | null
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          interval_days?: number
          last_reminded_at?: string | null
          next_remind_at?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_reminders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      review_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          updated_at: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
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
      saved_searches: {
        Row: {
          alert_enabled: boolean
          created_at: string
          filters: Json
          id: string
          last_alert_at: string | null
          last_match_count: number
          name: string
          query: string | null
          sort_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_alert_at?: string | null
          last_match_count?: number
          name: string
          query?: string | null
          sort_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_alert_at?: string | null
          last_match_count?: number
          name?: string
          query?: string | null
          sort_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      secret_rotation_schedules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_rotated_at: string | null
          next_due_at: string
          notes: string | null
          owner_email: string | null
          rotation_interval_days: number
          secret_name: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          next_due_at?: string
          notes?: string | null
          owner_email?: string | null
          rotation_interval_days?: number
          secret_name: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          next_due_at?: string
          notes?: string | null
          owner_email?: string | null
          rotation_interval_days?: number
          secret_name?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_detection_findings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          event_count: number
          group_key: string
          id: string
          metadata: Json
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string
          severity: string
          status: string
          updated_at: string
          window_ended_at: string
          window_started_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          event_count: number
          group_key: string
          id?: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id: string
          severity: string
          status?: string
          updated_at?: string
          window_ended_at?: string
          window_started_at: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          event_count?: number
          group_key?: string
          id?: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string
          severity?: string
          status?: string
          updated_at?: string
          window_ended_at?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_detection_findings_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "security_detection_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_detection_rules: {
        Row: {
          active: boolean
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          group_by: string
          id: string
          last_triggered_at: string | null
          name: string
          severity: string
          source: string | null
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          active?: boolean
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          group_by?: string
          id?: string
          last_triggered_at?: string | null
          name: string
          severity?: string
          source?: string | null
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          active?: boolean
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          group_by?: string
          id?: string
          last_triggered_at?: string | null
          name?: string
          severity?: string
          source?: string | null
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      security_event_ledger: {
        Row: {
          actor_id: string | null
          correlation_id: string | null
          country_code: string | null
          created_at: string
          event_hash: string
          event_type: string
          fingerprint_hash: string | null
          id: string
          ip: unknown
          metadata: Json
          occurred_at: string
          previous_hash: string | null
          severity: string
          source: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          actor_id?: string | null
          correlation_id?: string | null
          country_code?: string | null
          created_at?: string
          event_hash: string
          event_type: string
          fingerprint_hash?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          previous_hash?: string | null
          severity?: string
          source: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          actor_id?: string | null
          correlation_id?: string | null
          country_code?: string | null
          created_at?: string
          event_hash?: string
          event_type?: string
          fingerprint_hash?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          previous_hash?: string | null
          severity?: string
          source?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: []
      }
      service_health_probe_results: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          probe_id: string
          status_code: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          probe_id: string
          status_code?: number | null
          success: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          probe_id?: string
          status_code?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_health_probe_results_probe_id_fkey"
            columns: ["probe_id"]
            isOneToOne: false
            referencedRelation: "service_health_probes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_health_probes: {
        Row: {
          consecutive_failures: number
          created_at: string
          description: string | null
          expected_status: number
          id: string
          interval_seconds: number
          is_active: boolean
          last_latency_ms: number | null
          last_run_at: string | null
          last_status: string | null
          method: string
          name: string
          timeout_ms: number
          updated_at: string
          url: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          expected_status?: number
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_latency_ms?: number | null
          last_run_at?: string | null
          last_status?: string | null
          method?: string
          name: string
          timeout_ms?: number
          updated_at?: string
          url: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          description?: string | null
          expected_status?: number
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_latency_ms?: number | null
          last_run_at?: string | null
          last_status?: string | null
          method?: string
          name?: string
          timeout_ms?: number
          updated_at?: string
          url?: string
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
      shared_carts: {
        Row: {
          adds_count: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          expires_at: string
          id: string
          item_count: number
          items: Json
          message: string | null
          session_id: string | null
          share_code: string
          subtotal: number
          views_count: number | null
        }
        Insert: {
          adds_count?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expires_at?: string
          id?: string
          item_count?: number
          items?: Json
          message?: string | null
          session_id?: string | null
          share_code?: string
          subtotal?: number
          views_count?: number | null
        }
        Update: {
          adds_count?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expires_at?: string
          id?: string
          item_count?: number
          items?: Json
          message?: string | null
          session_id?: string | null
          share_code?: string
          subtotal?: number
          views_count?: number | null
        }
        Relationships: []
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
      shiprocket_shipments: {
        Row: {
          awb_code: string | null
          courier_id: number | null
          courier_name: string | null
          created_at: string | null
          delivery_address: Json | null
          dimensions: Json | null
          estimated_delivery: string | null
          id: string
          label_url: string | null
          manifest_url: string | null
          order_id: string | null
          pickup_address: Json | null
          pickup_scheduled_date: string | null
          raw_response: Json | null
          shipping_charges: number | null
          shiprocket_order_id: string | null
          shiprocket_shipment_id: string | null
          status: string | null
          sub_order_id: string | null
          tracking_url: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          awb_code?: string | null
          courier_id?: number | null
          courier_name?: string | null
          created_at?: string | null
          delivery_address?: Json | null
          dimensions?: Json | null
          estimated_delivery?: string | null
          id?: string
          label_url?: string | null
          manifest_url?: string | null
          order_id?: string | null
          pickup_address?: Json | null
          pickup_scheduled_date?: string | null
          raw_response?: Json | null
          shipping_charges?: number | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status?: string | null
          sub_order_id?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          awb_code?: string | null
          courier_id?: number | null
          courier_name?: string | null
          created_at?: string | null
          delivery_address?: Json | null
          dimensions?: Json | null
          estimated_delivery?: string | null
          id?: string
          label_url?: string | null
          manifest_url?: string | null
          order_id?: string | null
          pickup_address?: Json | null
          pickup_scheduled_date?: string | null
          raw_response?: Json | null
          shipping_charges?: number | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status?: string | null
          sub_order_id?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shiprocket_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shiprocket_shipments_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
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
      slo_definitions: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          scope: string
          scope_ref: string | null
          target_type: string
          target_value: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          scope?: string
          scope_ref?: string | null
          target_type: string
          target_value: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          scope?: string
          scope_ref?: string | null
          target_type?: string
          target_value?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      sms_delivery_events: {
        Row: {
          cost_cents: number | null
          country_code: string | null
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json
          occurred_at: string
          provider: string
          provider_message_id: string | null
          recipient_hash: string | null
          segment_count: number | null
          status: string
          template_key: string | null
        }
        Insert: {
          cost_cents?: number | null
          country_code?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          provider?: string
          provider_message_id?: string | null
          recipient_hash?: string | null
          segment_count?: number | null
          status: string
          template_key?: string | null
        }
        Update: {
          cost_cents?: number | null
          country_code?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          provider?: string
          provider_message_id?: string | null
          recipient_hash?: string | null
          segment_count?: number | null
          status?: string
          template_key?: string | null
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
      style_profiles: {
        Row: {
          avoid_materials: string[]
          bottom_size: string | null
          created_at: string
          dress_size: string | null
          favorite_colors: string[]
          gifting_for_others: boolean
          preferred_fit: string | null
          shoe_size: string | null
          top_size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_materials?: string[]
          bottom_size?: string | null
          created_at?: string
          dress_size?: string | null
          favorite_colors?: string[]
          gifting_for_others?: boolean
          preferred_fit?: string | null
          shoe_size?: string | null
          top_size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_materials?: string[]
          bottom_size?: string | null
          created_at?: string
          dress_size?: string | null
          favorite_colors?: string[]
          gifting_for_others?: boolean
          preferred_fit?: string | null
          shoe_size?: string | null
          top_size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      system_heartbeats: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          latency_ms: number | null
          observed_at: string
          service_kind: string
          service_name: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          latency_ms?: number | null
          observed_at?: string
          service_kind: string
          service_name: string
          status: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          latency_ms?: number | null
          observed_at?: string
          service_kind?: string
          service_name?: string
          status?: string
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
      threat_intel_feeds: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          feed_type: string
          id: string
          indicator_count: number
          is_active: boolean
          last_synced_at: string | null
          name: string
          severity: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          feed_type: string
          id?: string
          indicator_count?: number
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          severity?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          feed_type?: string
          id?: string
          indicator_count?: number
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          severity?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      threat_intel_indicators: {
        Row: {
          created_at: string
          feed_id: string
          first_seen: string
          id: string
          indicator_type: string
          indicator_value: string
          is_active: boolean
          last_seen: string
          notes: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          feed_id: string
          first_seen?: string
          id?: string
          indicator_type: string
          indicator_value: string
          is_active?: boolean
          last_seen?: string
          notes?: string | null
          severity?: string
        }
        Update: {
          created_at?: string
          feed_id?: string
          first_seen?: string
          id?: string
          indicator_type?: string
          indicator_value?: string
          is_active?: boolean
          last_seen?: string
          notes?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_intel_indicators_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "threat_intel_feeds"
            referencedColumns: ["id"]
          },
        ]
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
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint_hash: string
          expires_at: string | null
          id: string
          ip_hash: string | null
          label: string | null
          last_seen_at: string
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint_hash: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          label?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint_hash?: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          label?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      two_factor_enrollments: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_used_at: string | null
          method: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          method: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          method?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      two_factor_policies: {
        Row: {
          allowed_methods: string[]
          created_at: string
          enforce_after: string | null
          grace_period_days: number
          id: string
          notes: string | null
          required: boolean
          target_role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_methods?: string[]
          created_at?: string
          enforce_after?: string | null
          grace_period_days?: number
          id?: string
          notes?: string | null
          required?: boolean
          target_role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_methods?: string[]
          created_at?: string
          enforce_after?: string | null
          grace_period_days?: number
          id?: string
          notes?: string | null
          required?: boolean
          target_role?: string
          updated_at?: string
          updated_by?: string | null
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
          device_type: string | null
          dwell_time_ms: number | null
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          product_id: string | null
          referrer: string | null
          scroll_depth: number | null
          search_query: string | null
          session_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          device_type?: string | null
          dwell_time_ms?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          product_id?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          search_query?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          device_type?: string | null
          dwell_time_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          product_id?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          search_query?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
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
      user_behavior_profiles: {
        Row: {
          avg_scroll_depth: number | null
          avg_session_duration_ms: number | null
          created_at: string | null
          engagement_score: number | null
          id: string
          last_active_at: string | null
          preferred_brands: Json | null
          preferred_categories: Json | null
          price_range_max: number | null
          price_range_min: number | null
          total_add_to_cart: number | null
          total_page_views: number | null
          total_product_views: number | null
          total_purchases: number | null
          total_searches: number | null
          total_wishlist_adds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_scroll_depth?: number | null
          avg_session_duration_ms?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_active_at?: string | null
          preferred_brands?: Json | null
          preferred_categories?: Json | null
          price_range_max?: number | null
          price_range_min?: number | null
          total_add_to_cart?: number | null
          total_page_views?: number | null
          total_product_views?: number | null
          total_purchases?: number | null
          total_searches?: number | null
          total_wishlist_adds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_scroll_depth?: number | null
          avg_session_duration_ms?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_active_at?: string | null
          preferred_brands?: Json | null
          preferred_categories?: Json | null
          price_range_max?: number | null
          price_range_min?: number | null
          total_add_to_cart?: number | null
          total_page_views?: number | null
          total_product_views?: number | null
          total_purchases?: number | null
          total_searches?: number | null
          total_wishlist_adds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      vendor_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          vendor_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          vendor_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "vendor_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_announcement_reads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_announcement_reads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_announcements: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          expires_at: string | null
          id: string
          priority: string
          publish_at: string | null
          status: string
          target_mode: string
          target_vendor_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          publish_at?: string | null
          status?: string
          target_mode?: string
          target_vendor_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          publish_at?: string | null
          status?: string
          target_mode?: string
          target_vendor_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_dispatch_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          reason: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          reason?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          reason?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_dispatch_holidays_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_dispatch_holidays_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_dispatch_schedules: {
        Row: {
          created_at: string
          cutoff_hours: Json
          id: string
          lead_days: number
          notes: string | null
          timezone: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          cutoff_hours?: Json
          id?: string
          lead_days?: number
          notes?: string | null
          timezone?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          cutoff_hours?: Json
          id?: string
          lead_days?: number
          notes?: string | null
          timezone?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_dispatch_schedules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_dispatch_schedules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_onboarding_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          is_required: boolean
          sort_order: number
          status: string
          task_key: string
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_required?: boolean
          sort_order?: number
          status?: string
          task_key: string
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_required?: boolean
          sort_order?: number
          status?: string
          task_key?: string
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_onboarding_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_onboarding_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payout_holds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          placed_by: string
          reason: string
          release_note: string | null
          released_at: string | null
          released_by: string | null
          severity: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          placed_by: string
          reason: string
          release_note?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          placed_by?: string
          reason?: string
          release_note?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payout_holds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payout_holds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
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
          grade: string | null
          id: string
          on_time_delivery_rate: number | null
          period: string
          period_end: string | null
          period_start: string | null
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
          grade?: string | null
          id?: string
          on_time_delivery_rate?: number | null
          period: string
          period_end?: string | null
          period_start?: string | null
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
          grade?: string | null
          id?: string
          on_time_delivery_rate?: number | null
          period?: string
          period_end?: string | null
          period_start?: string | null
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
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          status?: string
        }
        Relationships: []
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
      _caller_is_active_admin: { Args: never; Returns: boolean }
      _login_hash: { Args: { _value: string }; Returns: string }
      accept_admin_invite: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
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
      admin_activity_heatmap_data: {
        Args: { _days?: number }
        Returns: {
          action_count: number
          day_of_week: number
          hour_of_day: number
        }[]
      }
      admin_activity_heatmap_stats: { Args: { _days?: number }; Returns: Json }
      admin_add_suppression: {
        Args: { _email: string; _notes?: string; _reason: string }
        Returns: string
      }
      admin_add_threat_indicators: {
        Args: { _feed_id: string; _indicators: Json; _severity?: string }
        Returns: number
      }
      admin_api_key_usage_by_endpoint: {
        Args: never
        Returns: {
          avg_latency: number
          calls: number
          endpoint: string
          errors: number
        }[]
      }
      admin_api_key_usage_recent: {
        Args: { _limit?: number }
        Returns: {
          api_key_id: string
          created_at: string
          endpoint: string
          error_message: string
          id: string
          ip_address: unknown
          latency_ms: number
          method: string
          status_code: number
        }[]
      }
      admin_api_key_usage_stats: { Args: never; Returns: Json }
      admin_approvals_stats: { Args: never; Returns: Json }
      admin_audit_query: {
        Args: {
          _action?: string
          _admin_id?: string
          _entity_id?: string
          _entity_type?: string
          _from?: string
          _limit?: number
          _offset?: number
          _search?: string
          _to?: string
        }
        Returns: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string
          new_values: Json
          old_values: Json
          total_count: number
          user_agent: string
        }[]
      }
      admin_backup_verifications_list: {
        Args: { _limit?: number }
        Returns: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          notes: string | null
          snapshot_id: string | null
          snapshot_label: string | null
          started_at: string | null
          status: string
          updated_at: string
          verified_by: string | null
          verified_rows: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "backup_verifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_backup_verifications_stats: { Args: never; Returns: Json }
      admin_bulk_update_orders: {
        Args: {
          p_admin_note?: string
          p_order_ids: string[]
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      admin_cancel_customer_broadcast: {
        Args: { _id: string; _reason?: string }
        Returns: undefined
      }
      admin_cancel_export_job: { Args: { _id: string }; Returns: undefined }
      admin_cancel_feature_rollout: {
        Args: { _id: string; _reason?: string }
        Returns: undefined
      }
      admin_captcha_recent: {
        Args: { _limit?: number; _only_failed?: boolean }
        Returns: {
          action: string
          created_at: string
          error_codes: string[]
          hostname: string
          id: string
          provider: string
          score: number
          success: boolean
          threshold: number
        }[]
      }
      admin_captcha_stats: { Args: { _days?: number }; Returns: Json }
      admin_circuit_breakers: {
        Args: never
        Returns: {
          category: string
          cooldown_seconds: number
          created_at: string
          failure_count: number
          failure_threshold: number
          label: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          opened_until: string | null
          service_key: string
          state: string
          success_count: number
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outbound_circuit_breakers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_consent_feed: {
        Args: { _limit?: number; _only_revoked?: boolean; _type?: string }
        Returns: {
          consent_type: string
          created_at: string
          email: string
          granted: boolean
          id: string
          source: string
          user_id: string
          version: string
          visitor_hash: string
        }[]
      }
      admin_consent_stats: { Args: { _days?: number }; Returns: Json }
      admin_create_api_key: {
        Args: {
          _description: string
          _expires_at: string
          _name: string
          _scopes: string[]
        }
        Returns: Json
      }
      admin_create_customer_broadcast: {
        Args: {
          _audience?: string
          _body: string
          _channel?: string
          _metadata?: Json
          _name: string
          _scheduled_at?: string
          _title: string
        }
        Returns: string
      }
      admin_create_export_job: {
        Args: { _filters: Json; _format: string; _resource_type: string }
        Returns: string
      }
      admin_create_export_request: {
        Args: {
          _reason?: string
          _request_type?: string
          _scopes?: string[]
          _subject_user_id: string
        }
        Returns: string
      }
      admin_create_incident: {
        Args: {
          _affected_services: string[]
          _impact: string
          _is_public?: boolean
          _public_summary: string
          _severity: string
          _source_alert_id?: string
          _title: string
        }
        Returns: string
      }
      admin_cron_status: {
        Args: { _runs_per_job?: number }
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          last_duration_ms: number
          last_return_message: string
          last_run_started_at: string
          last_status: string
          recent_runs: Json
          schedule: string
        }[]
      }
      admin_customer_communications: {
        Args: { _channel?: string; _limit?: number; _user_id: string }
        Returns: {
          channel: string
          metadata: Json
          occurred_at: string
          provider_id: string
          recipient: string
          status: string
          subject: string
        }[]
      }
      admin_customer_communications_stats: {
        Args: { _user_id: string }
        Returns: Json
      }
      admin_customer_notes_list: {
        Args: { _customer_id: string; _include_archived?: boolean }
        Returns: {
          author_email: string
          author_id: string
          body: string
          category: string
          created_at: string
          customer_id: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          updated_at: string
        }[]
      }
      admin_customer_notes_stats: {
        Args: { _customer_id: string }
        Returns: Json
      }
      admin_customer_tag_assign: {
        Args: { _customer_id: string; _tag_id: string }
        Returns: string
      }
      admin_customer_tag_remove: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      admin_customer_tags_for: {
        Args: { _customer_id: string }
        Returns: {
          assignment_id: string
          color: string
          created_at: string
          label: string
          tag_id: string
        }[]
      }
      admin_customer_tags_list: {
        Args: never
        Returns: {
          color: string
          created_at: string
          description: string
          id: string
          label: string
          usage_count: number
        }[]
      }
      admin_decide_approval: {
        Args: { _approve: boolean; _id: string; _notes?: string }
        Returns: boolean
      }
      admin_delete_api_key: { Args: { _id: string }; Returns: undefined }
      admin_delete_geo_rule: { Args: { _id: string }; Returns: boolean }
      admin_delete_inbound_webhook_rule: {
        Args: { _id: string }
        Returns: boolean
      }
      admin_delete_ip_allowlist: { Args: { _id: string }; Returns: undefined }
      admin_delete_notification_template: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_delete_probe: { Args: { _id: string }; Returns: undefined }
      admin_delete_rate_limit_policy: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_delete_retention_policy: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_delete_scheduled_report: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_delete_security_rule: { Args: { _id: string }; Returns: boolean }
      admin_delete_webhook_subscription: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_dlq_discard: {
        Args: { _id: string; _reason?: string }
        Returns: {
          attempts: number
          created_at: string
          error_message: string
          id: string
          job_type: string
          last_attempt_at: string
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          source: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "dead_letter_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_dlq_list: {
        Args: {
          _job_type?: string
          _limit?: number
          _offset?: number
          _status?: string
        }
        Returns: {
          attempts: number
          created_at: string
          error_message: string
          id: string
          job_type: string
          last_attempt_at: string
          next_retry_at: string
          payload: Json
          resolved_at: string
          resolved_by: string
          source: string
          status: string
          total_count: number
        }[]
      }
      admin_dlq_replay: {
        Args: { _id: string }
        Returns: {
          attempts: number
          created_at: string
          error_message: string
          id: string
          job_type: string
          last_attempt_at: string
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          source: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "dead_letter_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_edge_metrics_summary: {
        Args: { _hours?: number }
        Returns: {
          avg_ms: number
          error_rate: number
          errors: number
          function_name: string
          invocations: number
          last_seen: string
          max_ms: number
          p50_ms: number
          p95_ms: number
          p99_ms: number
        }[]
      }
      admin_edge_metrics_trend: {
        Args: { _function_name: string; _hours?: number }
        Returns: {
          avg_ms: number
          bucket: string
          errors: number
          invocations: number
          p95_ms: number
        }[]
      }
      admin_email_deliverability_stats: {
        Args: { _hours?: number }
        Returns: Json
      }
      admin_email_recent_events: {
        Args: { _limit?: number; _status?: string; _template?: string }
        Returns: {
          bounce_type: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          occurred_at: string
          provider: string
          provider_message_id: string | null
          recipient_domain: string | null
          recipient_hash: string
          status: string
          subject: string | null
          template: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "email_delivery_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_end_maintenance: { Args: { _id: string }; Returns: undefined }
      admin_expire_backup_snapshots: { Args: never; Returns: number }
      admin_export_jobs_list: {
        Args: { _limit?: number }
        Returns: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string
          file_size_bytes: number | null
          file_url: string | null
          filters: Json
          format: string
          id: string
          progress: number
          requested_by: string | null
          resource_type: string
          row_count: number | null
          started_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "data_export_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_export_jobs_stats: { Args: never; Returns: Json }
      admin_feature_adoption_leaderboard: {
        Args: { _days?: number }
        Returns: {
          feature_key: string
          last_used: string
          total_uses: number
          unique_admins: number
        }[]
      }
      admin_feature_adoption_stats: { Args: { _days?: number }; Returns: Json }
      admin_geo_rules_list: {
        Args: never
        Returns: {
          active: boolean
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          mode: string
          reason: string | null
          scope: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "geo_block_rules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      admin_inbound_webhook_list: {
        Args: never
        Returns: {
          active: boolean
          cidr: unknown
          created_at: string
          created_by: string | null
          endpoint_path: string | null
          expires_at: string | null
          id: string
          label: string | null
          notes: string | null
          provider: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "inbound_webhook_allowlist"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_latest_heartbeats: {
        Args: { _within_minutes?: number }
        Returns: {
          detail: Json
          is_stale: boolean
          latency_ms: number
          observed_at: string
          service_kind: string
          service_name: string
          status: string
        }[]
      }
      admin_list_admin_sessions: {
        Args: { _limit?: number; _only_active?: boolean }
        Returns: {
          admin_user_id: string
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          is_suspicious: boolean
          last_seen_at: string
          revoked_at: string | null
          revoked_by: string | null
          session_token_hash: string
          suspicious_reason: string | null
          updated_at: string
          user_agent: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_session_activity"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_export_requests: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          processed_at: string | null
          reason: string | null
          request_type: string
          requested_by: string
          scopes: string[]
          status: string
          subject_email: string | null
          subject_user_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "compliance_export_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_lock_identifier: {
        Args: {
          _identifier: string
          _minutes?: number
          _reason?: string
          _type: string
        }
        Returns: string
      }
      admin_login_lockouts_list: {
        Args: never
        Returns: {
          attempt_count: number
          created_at: string
          id: string
          identifier_hash: string
          identifier_label: string | null
          identifier_type: string
          locked_until: string
          reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "login_lockouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_login_security_stats: { Args: { _hours?: number }; Returns: Json }
      admin_mark_backup_restored: {
        Args: { _notes?: string; _snapshot_id: string }
        Returns: undefined
      }
      admin_mark_secret_rotated:
        | { Args: { _id: string }; Returns: undefined }
        | { Args: { _name: string; _note?: string }; Returns: undefined }
      admin_order_hold_place: {
        Args: {
          _expires_at?: string
          _notes?: string
          _order_id: string
          _reason_code: string
          _severity: string
        }
        Returns: string
      }
      admin_order_hold_release: {
        Args: { _hold_id: string; _release_notes?: string }
        Returns: boolean
      }
      admin_order_holds_list: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: Json
      }
      admin_order_holds_stats: { Args: never; Returns: Json }
      admin_order_note_template_use: { Args: { _id: string }; Returns: boolean }
      admin_order_note_templates_stats: { Args: never; Returns: Json }
      admin_order_tag_assign: {
        Args: { _order_id: string; _tag_id: string }
        Returns: boolean
      }
      admin_order_tag_remove: {
        Args: { _order_id: string; _tag_id: string }
        Returns: boolean
      }
      admin_order_tags_for: { Args: { _order_id: string }; Returns: Json }
      admin_order_tags_list: { Args: never; Returns: Json }
      admin_override_risk_score: {
        Args: { _reason: string; _score: number; _user_id: string }
        Returns: undefined
      }
      admin_payout_hold_place: {
        Args: { _reason: string; _severity?: string; _vendor_id: string }
        Returns: string
      }
      admin_payout_hold_release: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      admin_payout_holds_list: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          placed_by: string
          reason: string
          release_note: string
          released_at: string
          released_by: string
          severity: string
          vendor_business_name: string
          vendor_id: string
        }[]
      }
      admin_payout_holds_stats: { Args: never; Returns: Json }
      admin_post_incident_update: {
        Args: { _incident_id: string; _message: string; _status: string }
        Returns: string
      }
      admin_probes_list: {
        Args: never
        Returns: {
          consecutive_failures: number
          created_at: string
          description: string | null
          expected_status: number
          id: string
          interval_seconds: number
          is_active: boolean
          last_latency_ms: number | null
          last_run_at: string | null
          last_status: string | null
          method: string
          name: string
          timeout_ms: number
          updated_at: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "service_health_probes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_probes_stats: { Args: never; Returns: Json }
      admin_process_due_customer_broadcasts: { Args: never; Returns: Json }
      admin_process_due_feature_rollouts: { Args: never; Returns: Json }
      admin_process_due_retention_policies: {
        Args: never
        Returns: {
          error: string
          policy_id: string
          purged: number
          table_name: string
        }[]
      }
      admin_process_due_scheduled_reports: { Args: never; Returns: Json }
      admin_publish_release_note: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_push_deliverability_stats: {
        Args: { _hours?: number }
        Returns: Json
      }
      admin_push_recent_events: {
        Args: { _limit?: number; _only_failed?: boolean }
        Returns: {
          campaign_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          occurred_at: string
          payload_size_bytes: number | null
          platform: string | null
          provider: string | null
          status: string
          subscription_id: string | null
          template_key: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "push_delivery_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_recent_login_attempts: {
        Args: { _limit?: number; _only_failed?: boolean }
        Returns: {
          attempted_at: string
          email_hash: string | null
          failure_reason: string | null
          id: string
          ip_hash: string | null
          ip_inet: unknown
          success: boolean
          user_agent: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "login_attempts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_record_admin_session: {
        Args: {
          _country?: string
          _ip_address?: string
          _session_token_hash: string
          _user_agent?: string
        }
        Returns: string
      }
      admin_record_backup_verification: {
        Args: {
          _duration_ms: number
          _error_message: string
          _notes: string
          _snapshot_id: string
          _snapshot_label: string
          _status: string
          _verified_rows: number
        }
        Returns: string
      }
      admin_record_probe_result: {
        Args: {
          _error_message: string
          _latency_ms: number
          _probe_id: string
          _status_code: number
          _success: boolean
        }
        Returns: string
      }
      admin_refund_approval_decide: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      admin_refund_approval_list: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          amount: number
          created_at: string
          decision_note: string
          id: string
          order_id: string
          order_number: string
          priority: string
          reason: string
          refund_id: string
          requested_by: string
          reviewed_at: string
          reviewer_id: string
          status: string
        }[]
      }
      admin_refund_approval_stats: { Args: never; Returns: Json }
      admin_refund_approval_submit: {
        Args: {
          _amount: number
          _order_id: string
          _priority?: string
          _reason: string
          _refund_id?: string
        }
        Returns: string
      }
      admin_register_backup_snapshot: {
        Args: {
          _label: string
          _notes?: string
          _retention_days?: number
          _scope?: Json
          _snapshot_type?: string
        }
        Returns: string
      }
      admin_render_notification_template: {
        Args: { _channel: string; _code: string; _locale: string; _vars: Json }
        Returns: Json
      }
      admin_replay_dlq_entry: { Args: { _id: string }; Returns: undefined }
      admin_replay_webhook_event: { Args: { _id: string }; Returns: undefined }
      admin_request_approval: {
        Args: { _action_type: string; _description: string; _payload: Json }
        Returns: string
      }
      admin_reset_two_factor_enrollment: {
        Args: { _id: string }
        Returns: boolean
      }
      admin_resolve_dlq_entry: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      admin_review_vendor_kyc: {
        Args: {
          p_action: string
          p_rejection_reason?: string
          p_vendor_id: string
        }
        Returns: Json
      }
      admin_revoke_admin_session: {
        Args: { _session_id: string }
        Returns: undefined
      }
      admin_revoke_api_key: { Args: { _id: string }; Returns: undefined }
      admin_revoke_trusted_device: { Args: { _id: string }; Returns: boolean }
      admin_risk_scores_list: {
        Args: { _limit?: number; _tier?: string }
        Returns: {
          email: string
          factors: Json
          full_name: string
          id: string
          last_computed_at: string
          manual_override: boolean
          override_reason: string
          score: number
          tier: string
          user_id: string
        }[]
      }
      admin_risk_scores_stats: { Args: never; Returns: Json }
      admin_rls_audit: {
        Args: never
        Returns: {
          approx_row_count: number
          has_anon_grant: boolean
          has_authenticated_grant: boolean
          has_service_role_grant: boolean
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      admin_rotate_webhook_secret: { Args: { _id: string }; Returns: string }
      admin_run_anomaly_detection: {
        Args: { _dry_run?: boolean }
        Returns: {
          alert_id: string
          baseline_value: number
          metric: string
          observed_value: number
          rule_id: string
          sample_count: number
          scope: string
          severity: string
          status: string
          threshold: number
        }[]
      }
      admin_run_retention_policy: { Args: { _id: string }; Returns: number }
      admin_saved_view_apply: { Args: { _id: string }; Returns: boolean }
      admin_saved_view_delete: { Args: { _id: string }; Returns: boolean }
      admin_saved_view_save: {
        Args: {
          _columns?: Json
          _description?: string
          _filters: Json
          _is_shared?: boolean
          _name: string
          _scope: string
          _sort?: Json
        }
        Returns: string
      }
      admin_saved_view_toggle_pin: { Args: { _id: string }; Returns: boolean }
      admin_saved_views_list: { Args: { _scope: string }; Returns: Json }
      admin_schedule_feature_rollout: {
        Args: {
          _audience?: string
          _feature_flag_id: string
          _notes?: string
          _rollout_name: string
          _rollout_percentage?: number
          _safety_threshold?: Json
          _scheduled_at?: string
          _target_state: boolean
        }
        Returns: string
      }
      admin_schedule_report: {
        Args: {
          _filters?: Json
          _format: string
          _frequency: string
          _name: string
          _next_run_at?: string
          _recipients: string[]
          _report_type: string
        }
        Returns: string
      }
      admin_secret_rotation_list: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_rotated_at: string | null
          next_due_at: string
          notes: string | null
          owner_email: string | null
          rotation_interval_days: number
          secret_name: string
          severity: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "secret_rotation_schedules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_secret_rotation_stats: { Args: never; Returns: Json }
      admin_secrets_status: {
        Args: never
        Returns: {
          category: string
          days_since_rotated: number
          days_until_due: number
          id: string
          last_rotated_at: string
          name: string
          notes: string
          owner_email: string
          rotation_count: number
          rotation_interval_days: number
          severity: string
          status: string
        }[]
      }
      admin_security_event_feed: {
        Args: { _limit?: number; _severity?: string; _source?: string }
        Returns: {
          actor_id: string | null
          correlation_id: string | null
          country_code: string | null
          created_at: string
          event_hash: string
          event_type: string
          fingerprint_hash: string | null
          id: string
          ip: unknown
          metadata: Json
          occurred_at: string
          previous_hash: string | null
          severity: string
          source: string
          subject_id: string | null
          subject_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "security_event_ledger"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_security_event_stats: { Args: { _hours?: number }; Returns: Json }
      admin_security_findings: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          created_at: string
          event_count: number
          group_key: string
          id: string
          metadata: Json
          rule_id: string
          rule_name: string
          severity: string
          status: string
          window_ended_at: string
          window_started_at: string
        }[]
      }
      admin_security_rules_list: {
        Args: never
        Returns: {
          active: boolean
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          group_by: string
          id: string
          last_triggered_at: string | null
          name: string
          severity: string
          source: string | null
          threshold: number
          updated_at: string
          window_minutes: number
        }[]
        SetofOptions: {
          from: "*"
          to: "security_detection_rules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_set_anomaly_alert_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_set_circuit_breaker: {
        Args: { _reason?: string; _service_key: string; _state: string }
        Returns: {
          category: string
          cooldown_seconds: number
          created_at: string
          failure_count: number
          failure_threshold: number
          label: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          opened_until: string | null
          service_key: string
          state: string
          success_count: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "outbound_circuit_breakers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_sla_breach_acknowledge: {
        Args: { _assign_to_me?: boolean; _id: string }
        Returns: undefined
      }
      admin_sla_breach_resolve: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      admin_sla_breaches_list: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          acknowledged_at: string
          assigned_to: string
          breach_type: string
          detected_at: string
          hours_overdue: number
          id: string
          order_id: string
          order_number: string
          order_status: string
          order_total: number
          resolution_note: string
          resolved_at: string
          severity: string
        }[]
      }
      admin_sla_breaches_stats: { Args: never; Returns: Json }
      admin_sms_deliverability_stats: {
        Args: { _hours?: number }
        Returns: Json
      }
      admin_sms_recent_events: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          cost_cents: number | null
          country_code: string | null
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json
          occurred_at: string
          provider: string
          provider_message_id: string | null
          recipient_hash: string | null
          segment_count: number | null
          status: string
          template_key: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sms_delivery_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_start_maintenance: {
        Args: {
          _allow_admins?: boolean
          _ends_at?: string
          _reason: string
          _scope: string
        }
        Returns: string
      }
      admin_storage_usage: {
        Args: never
        Returns: {
          avg_bytes: number
          bucket_id: string
          is_public: boolean
          largest_bytes: number
          last_uploaded_at: string
          object_count: number
          total_bytes: number
        }[]
      }
      admin_suppression_list: {
        Args: { _limit?: number; _reason?: string; _search?: string }
        Returns: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_event_at: string
          notes: string | null
          reason: string
          source: string | null
          suppression_count: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_suppression_list"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_suppression_stats: { Args: never; Returns: Json }
      admin_threat_feeds_list: {
        Args: never
        Returns: {
          created_at: string
          created_by: string | null
          description: string | null
          feed_type: string
          id: string
          indicator_count: number
          is_active: boolean
          last_synced_at: string | null
          name: string
          severity: string
          source_url: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "threat_intel_feeds"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_threat_feeds_stats: { Args: never; Returns: Json }
      admin_toggle_ip_allowlist: {
        Args: { _id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_toggle_notification_template: {
        Args: { _id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_toggle_rate_limit_policy: {
        Args: { _id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_toggle_retention_policy: {
        Args: { _id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_toggle_scheduled_report: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      admin_toggle_suppression: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      admin_toggle_webhook_subscription: {
        Args: { _id: string; _is_active: boolean }
        Returns: undefined
      }
      admin_trusted_devices_list: {
        Args: { _limit?: number; _only_active?: boolean }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          label: string
          last_seen_at: string
          revoked_at: string
          user_agent: string
          user_id: string
        }[]
      }
      admin_trusted_devices_stats: { Args: { _days?: number }; Returns: Json }
      admin_two_factor_enrollments: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          email: string
          id: string
          label: string
          last_used_at: string
          method: string
          user_id: string
          verified: boolean
        }[]
      }
      admin_two_factor_policies_list: {
        Args: never
        Returns: {
          allowed_methods: string[]
          created_at: string
          enforce_after: string | null
          grace_period_days: number
          id: string
          notes: string | null
          required: boolean
          target_role: string
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "two_factor_policies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_unlock_identifier: { Args: { _id: string }; Returns: undefined }
      admin_update_security_finding_status: {
        Args: { _id: string; _status: string }
        Returns: boolean
      }
      admin_upsert_geo_rule: {
        Args: {
          _active: boolean
          _country: string
          _id: string
          _mode: string
          _reason: string
          _scope: string
        }
        Returns: string
      }
      admin_upsert_inbound_webhook_rule: {
        Args: {
          _active: boolean
          _cidr: string
          _endpoint_path: string
          _expires_at: string
          _id: string
          _label: string
          _notes: string
          _provider: string
        }
        Returns: string
      }
      admin_upsert_ip_allowlist: {
        Args: {
          _cidr: string
          _description: string
          _expires_at: string
          _id: string
          _is_active: boolean
          _label: string
        }
        Returns: string
      }
      admin_upsert_notification_template: {
        Args: {
          _body: string
          _channel: string
          _code: string
          _description: string
          _id: string
          _is_active: boolean
          _locale: string
          _name: string
          _subject: string
          _variables: Json
          _version: number
        }
        Returns: string
      }
      admin_upsert_probe: {
        Args: {
          _description: string
          _expected_status: number
          _interval_seconds: number
          _is_active: boolean
          _method: string
          _name: string
          _timeout_ms: number
          _url: string
        }
        Returns: string
      }
      admin_upsert_rate_limit_policy: {
        Args: {
          _action: string
          _burst_multiplier: number
          _description: string
          _endpoint_pattern: string
          _id: string
          _is_active: boolean
          _max_requests: number
          _name: string
          _scope: string
          _window_seconds: number
        }
        Returns: string
      }
      admin_upsert_release_note: {
        Args: {
          _audience?: string
          _body: string
          _id: string
          _slug: string
          _status?: string
          _summary: string
          _tags?: string[]
          _title: string
          _version?: string
        }
        Returns: string
      }
      admin_upsert_retention_policy: {
        Args: {
          _date_column: string
          _delete_mode: string
          _description: string
          _filter_expression: string
          _id: string
          _is_active: boolean
          _retention_days: number
          _soft_delete_column: string
          _table_name: string
        }
        Returns: string
      }
      admin_upsert_secret_rotation: {
        Args: {
          _description: string
          _interval_days: number
          _is_active: boolean
          _notes: string
          _owner_email: string
          _secret_name: string
          _severity: string
        }
        Returns: string
      }
      admin_upsert_security_rule: {
        Args: {
          _active: boolean
          _cooldown_minutes: number
          _description: string
          _event_type: string
          _group_by: string
          _id: string
          _name: string
          _severity: string
          _source: string
          _threshold: number
          _window_minutes: number
        }
        Returns: string
      }
      admin_upsert_threat_feed: {
        Args: {
          _description: string
          _feed_type: string
          _id: string
          _is_active: boolean
          _name: string
          _severity: string
          _source_url: string
        }
        Returns: string
      }
      admin_upsert_two_factor_policy: {
        Args: {
          _allowed_methods: string[]
          _enforce_after: string
          _grace_period_days: number
          _notes: string
          _required: boolean
          _target_role: string
        }
        Returns: string
      }
      admin_upsert_webhook_subscription: {
        Args: {
          _description: string
          _event_types: string[]
          _headers: Json
          _id: string
          _is_active: boolean
          _max_retries: number
          _name: string
          _secret: string
          _target_url: string
          _timeout_ms: number
        }
        Returns: string
      }
      admin_vendor_announcements_list: {
        Args: { _status?: string }
        Returns: Json
      }
      admin_verify_security_ledger: { Args: { _limit?: number }; Returns: Json }
      admin_watchlist_add: {
        Args: {
          _due_at?: string
          _order_id: string
          _reason: string
          _severity?: string
        }
        Returns: string
      }
      admin_watchlist_list: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          created_at: string
          due_at: string
          id: string
          order_id: string
          order_number: string
          order_status: string
          order_total: number
          reason: string
          resolved_at: string
          severity: string
        }[]
      }
      admin_watchlist_remove: { Args: { _id: string }; Returns: undefined }
      admin_watchlist_resolve: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      admin_watchlist_stats: { Args: never; Returns: Json }
      admin_webhook_delivery_stats: {
        Args: { _hours?: number; _id: string }
        Returns: Json
      }
      admin_webhook_events: {
        Args: {
          _limit?: number
          _offset?: number
          _provider?: string
          _search?: string
          _status?: string
        }
        Returns: {
          created_at: string
          error: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string
          provider: string
          status: string
          total_count: number
        }[]
      }
      admin_webhook_requeue: {
        Args: { _id: string; _reason?: string }
        Returns: {
          attempts: number
          created_at: string
          error_message: string
          id: string
          job_type: string
          last_attempt_at: string
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          source: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "dead_letter_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_webhook_stats: {
        Args: { _days?: number }
        Returns: {
          duplicates: number
          failed: number
          last_event_at: string
          processed: number
          provider: string
          total: number
        }[]
      }
      api_key_verify: {
        Args: { _ip?: unknown; _token: string }
        Returns: {
          id: string
          name: string
          scopes: string[]
        }[]
      }
      calculate_bundle_stock: { Args: { p_bundle_id: string }; Returns: number }
      calculate_loyalty_tier: {
        Args: { lifetime_pts: number }
        Returns: string
      }
      can_manage_admins: { Args: { _user_id: string }; Returns: boolean }
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
      check_threat_indicator: {
        Args: { _value: string }
        Returns: {
          feed_name: string
          matched: boolean
          severity: string
        }[]
      }
      circuit_breaker_before_request: {
        Args: { _service_key: string }
        Returns: {
          allowed: boolean
          failure_count: number
          opened_until: string
          retry_after_seconds: number
          state: string
        }[]
      }
      circuit_breaker_record_failure: {
        Args: { _error?: string; _service_key: string }
        Returns: {
          category: string
          cooldown_seconds: number
          created_at: string
          failure_count: number
          failure_threshold: number
          label: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          opened_until: string | null
          service_key: string
          state: string
          success_count: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "outbound_circuit_breakers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      circuit_breaker_record_success: {
        Args: { _service_key: string }
        Returns: {
          category: string
          cooldown_seconds: number
          created_at: string
          failure_count: number
          failure_threshold: number
          label: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          opened_until: string | null
          service_key: string
          state: string
          success_count: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "outbound_circuit_breakers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_mutation_key: {
        Args: {
          _key: string
          _request_hash: string
          _scope: string
          _user_id: string
        }
        Returns: {
          cached: Json
          claimed: boolean
          http_status: number
          status: string
        }[]
      }
      claim_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _identifier_type: string
          _max_requests: number
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      claim_webhook_event: {
        Args: {
          _event_id: string
          _event_type?: string
          _payload?: Json
          _provider: string
        }
        Returns: boolean
      }
      cleanup_old_edge_metrics: { Args: { _days?: number }; Returns: number }
      cleanup_old_heartbeats: { Args: { _days?: number }; Returns: number }
      complete_mutation_key: {
        Args: {
          _http_status: number
          _key: string
          _response: Json
          _scope: string
          _success: boolean
        }
        Returns: undefined
      }
      compute_customer_risk_score: { Args: { _user_id: string }; Returns: Json }
      compute_inventory_forecasts: {
        Args: { p_period_days?: number }
        Returns: Json
      }
      compute_product_abandonment_stats: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: undefined
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
      delete_my_admin_bookmark: { Args: { _id: string }; Returns: undefined }
      derive_risk_tier: { Args: { _score: number }; Returns: string }
      detect_order_sla_breaches: { Args: never; Returns: Json }
      evaluate_security_detection_rules: { Args: never; Returns: Json }
      expire_spin_wheel_codes: { Args: never; Returns: number }
      generate_campaign_code: { Args: never; Returns: string }
      generate_credit_note_number: { Args: never; Returns: string }
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
      get_cart_recovery_discount: {
        Args: { p_cart_value: number; p_email_step?: number; p_user_id: string }
        Returns: Json
      }
      get_due_back_in_stock_waitlist: {
        Args: { _limit?: number }
        Returns: {
          email: string
          product_id: string
          slug: string
          stock: number
          title: string
          user_id: string
          waitlist_id: string
        }[]
      }
      get_dynamic_price: {
        Args: { p_product_id: string; p_quantity?: number; p_user_id?: string }
        Returns: Json
      }
      get_my_admin_notification_prefs: {
        Args: never
        Returns: {
          admin_user_id: string
          categories: string[]
          channel_email: boolean
          channel_in_app: boolean
          channel_sms: boolean
          created_at: string
          id: string
          is_active: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          severity_threshold: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "admin_notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_shared_wishlist: {
        Args: { _share_code: string }
        Returns: Json
      }
      get_trending_products: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          compare_at_price: number
          id: string
          price: number
          primary_image: string
          slug: string
          title: string
          vendor_name: string
          vendor_slug: string
          view_count: number
          viewer_count: number
        }[]
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
      increment_shared_wishlist_view: {
        Args: { _share_code: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_ip_allowed: { Args: { _ip: unknown }; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_country_blocked: {
        Args: { _country: string; _scope: string }
        Returns: boolean
      }
      is_device_trusted: {
        Args: { _fingerprint_hash: string; _user: string }
        Returns: boolean
      }
      is_identifier_locked: {
        Args: { _type: string; _value: string }
        Returns: boolean
      }
      is_in_quiet_hours: { Args: { _user_id: string }; Returns: boolean }
      is_inbound_webhook_ip_allowed: {
        Args: { _ip: unknown; _provider: string }
        Returns: boolean
      }
      is_kill_switch_active: { Args: { _key: string }; Returns: boolean }
      is_list_owner: { Args: { _list_id: string }; Returns: boolean }
      is_list_public: { Args: { _list_id: string }; Returns: boolean }
      is_maintenance_active: { Args: { _service?: string }; Returns: boolean }
      is_order_customer: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_order_vendor: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_vendor_promotion: {
        Args: { _applicable_vendors: string[] }
        Returns: boolean
      }
      is_two_factor_required: { Args: { _role: string }; Returns: boolean }
      is_vendor: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_active: { Args: { vendor_id: string }; Returns: boolean }
      latest_consent: {
        Args: { _type: string; _user: string }
        Returns: boolean
      }
      list_my_admin_bookmarks: {
        Args: never
        Returns: {
          admin_user_id: string
          created_at: string
          icon: string | null
          id: string
          label: string
          path: string
          sort_order: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_bookmarks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      lookup_referral_code: { Args: { p_code: string }; Returns: Json }
      mark_webhook_processed: {
        Args: {
          _error?: string
          _event_id: string
          _provider: string
          _status?: string
        }
        Returns: undefined
      }
      prune_analytics_events: {
        Args: { retention_days?: number }
        Returns: number
      }
      public_status_snapshot: { Args: never; Returns: Json }
      record_admin_feature_usage: {
        Args: { _feature_key: string }
        Returns: undefined
      }
      record_consent: {
        Args: {
          _consent_type: string
          _evidence?: Json
          _granted: boolean
          _ip_hash?: string
          _source?: string
          _user_agent_hash?: string
          _version?: string
          _visitor_hash?: string
        }
        Returns: string
      }
      record_edge_metric: {
        Args: {
          _duration_ms: number
          _error_code?: string
          _function_name: string
          _status_code: number
        }
        Returns: undefined
      }
      record_heartbeat: {
        Args: {
          _detail?: Json
          _latency_ms?: number
          _service_kind: string
          _service_name: string
          _status: string
        }
        Returns: string
      }
      record_login_attempt: {
        Args: {
          _email: string
          _ip: string
          _reason?: string
          _success: boolean
          _user_agent?: string
        }
        Returns: undefined
      }
      record_security_event: {
        Args: {
          _actor_id?: string
          _correlation_id?: string
          _country_code?: string
          _event_type: string
          _fingerprint_hash?: string
          _ip?: unknown
          _metadata?: Json
          _severity?: string
          _source: string
          _subject_id?: string
          _subject_type?: string
        }
        Returns: string
      }
      redeem_loyalty_points: {
        Args: {
          p_expires_at: string
          p_option_id: string
          p_points_cost: number
          p_reward_code: string
          p_reward_details: Json
          p_user_id: string
        }
        Returns: Json
      }
      refresh_admin_activity_heatmap: {
        Args: { _days?: number }
        Returns: number
      }
      refresh_product_associations: {
        Args: { p_limit?: number; p_since?: string }
        Returns: Json
      }
      reorder_my_admin_bookmarks: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      restore_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      retention_allowed_table: { Args: { _table: string }; Returns: boolean }
      toggle_kill_switch: {
        Args: { _enabled: boolean; _key: string; _reason: string }
        Returns: {
          category: string
          created_at: string
          description: string | null
          is_enabled: boolean
          key: string
          label: string
          reason: string | null
          toggled_at: string
          toggled_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kill_switches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      track_campaign_event: {
        Args: {
          p_code: string
          p_device_info?: Json
          p_event_type: string
          p_metadata?: Json
          p_referrer?: string
          p_session_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      track_product_view: {
        Args: { _product_id: string; _source?: string }
        Returns: undefined
      }
      update_behavior_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      upsert_my_admin_bookmark: {
        Args: { _icon?: string; _label: string; _path: string }
        Returns: string
      }
      upsert_my_admin_notification_prefs: {
        Args: {
          _categories: string[]
          _channel_email: boolean
          _channel_in_app: boolean
          _channel_sms: boolean
          _is_active: boolean
          _quiet_hours_end: string
          _quiet_hours_start: string
          _severity_threshold: string
          _timezone: string
        }
        Returns: string
      }
      upsert_trusted_device: {
        Args: {
          _fingerprint_hash: string
          _ip_hash?: string
          _label?: string
          _ttl_days?: number
          _user_agent?: string
        }
        Returns: string
      }
      validate_admin_invite: { Args: { p_token: string }; Returns: Json }
      vendor_compute_next_dispatch: {
        Args: { _placed_at?: string; _vendor_id: string }
        Returns: string
      }
      vendor_dispatch_schedule_get: {
        Args: { _vendor_id: string }
        Returns: Json
      }
      vendor_is_payout_blocked: {
        Args: { _vendor_id: string }
        Returns: boolean
      }
      vendor_mark_announcement_read: {
        Args: { _announcement_id: string }
        Returns: boolean
      }
      vendor_my_announcements: { Args: never; Returns: Json }
      vendor_onboarding_list: {
        Args: { _vendor_id: string }
        Returns: {
          completed_at: string
          description: string
          due_at: string
          id: string
          is_required: boolean
          sort_order: number
          status: string
          task_key: string
          title: string
        }[]
      }
      vendor_onboarding_seed: { Args: { _vendor_id: string }; Returns: number }
      vendor_onboarding_set_status: {
        Args: { _status: string; _task_id: string }
        Returns: undefined
      }
      vendor_onboarding_stats: { Args: { _vendor_id: string }; Returns: Json }
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
