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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      hc_account_audit: {
        Row: {
          created_at: string
          event: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      hc_account_security: {
        Row: {
          owner_id: string
          revoked_through: number
        }
        Insert: {
          owner_id: string
          revoked_through?: number
        }
        Update: {
          owner_id?: string
          revoked_through?: number
        }
        Relationships: []
      }
      hc_audit: {
        Row: {
          created_at: string
          device_id: string
          event: string
          id: string
          owner_id: string
          resource_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          event: string
          id?: string
          owner_id: string
          resource_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          event?: string
          id?: string
          owner_id?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      hc_chunks: {
        Row: {
          bytes: string
          position: number
          transfer_id: string
        }
        Insert: {
          bytes: string
          position: number
          transfer_id: string
        }
        Update: {
          bytes?: string
          position?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_chunks_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "hc_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_devices: {
        Row: {
          attempt_window: string
          attempts: number
          created_at: string
          id: string
          last_seen: string
          name: string
          owner_id: string
          public_key: Json
          revoked_at: string | null
        }
        Insert: {
          attempt_window?: string
          attempts?: number
          created_at?: string
          id?: string
          last_seen?: string
          name: string
          owner_id: string
          public_key: Json
          revoked_at?: string | null
        }
        Update: {
          attempt_window?: string
          attempts?: number
          created_at?: string
          id?: string
          last_seen?: string
          name?: string
          owner_id?: string
          public_key?: Json
          revoked_at?: string | null
        }
        Relationships: []
      }
      hc_pair_requests: {
        Row: {
          claimant: string | null
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          issuer: string
          owner_id: string
          state: string
        }
        Insert: {
          claimant?: string | null
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          issuer: string
          owner_id: string
          state?: string
        }
        Update: {
          claimant?: string | null
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          issuer?: string
          owner_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_pair_requests_claimant_fkey"
            columns: ["claimant"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_pair_requests_issuer_fkey"
            columns: ["issuer"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_proofs: {
        Row: {
          device_id: string
          expires_at: string
          id: string
          owner_id: string
          used: boolean
        }
        Insert: {
          device_id: string
          expires_at?: string
          id?: string
          owner_id: string
          used?: boolean
        }
        Update: {
          device_id?: string
          expires_at?: string
          id?: string
          owner_id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hc_proofs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_revoked_sessions: {
        Row: {
          owner_id: string
          session_id: string
        }
        Insert: {
          owner_id: string
          session_id: string
        }
        Update: {
          owner_id?: string
          session_id?: string
        }
        Relationships: []
      }
      hc_transfers: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          name: string
          owner_id: string
          received_bytes: number
          recipient: string
          sender: string
          sha256: string
          size: number
          state: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          name: string
          owner_id: string
          received_bytes?: number
          recipient: string
          sender: string
          sha256: string
          size: number
          state?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          name?: string
          owner_id?: string
          received_bytes?: number
          recipient?: string
          sender?: string
          sha256?: string
          size?: number
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_transfers_recipient_fkey"
            columns: ["recipient"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_transfers_sender_fkey"
            columns: ["sender"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_trust: {
        Row: {
          created_at: string
          device_a: string
          device_b: string
          id: string
          owner_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          device_a: string
          device_b: string
          id?: string
          owner_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          device_a?: string
          device_b?: string
          id?: string
          owner_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hc_trust_device_a_fkey"
            columns: ["device_a"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_trust_device_b_fkey"
            columns: ["device_b"]
            isOneToOne: false
            referencedRelation: "hc_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string
          id: string
          preferences: Json
        }
        Insert: {
          display_name?: string
          id: string
          preferences?: Json
        }
        Update: {
          display_name?: string
          id?: string
          preferences?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hc_action: {
        Args: {
          p_data: Json
          p_device: string
          p_op: string
          p_owner: string
          p_proof: string
        }
        Returns: Json
      }
      hc_revoke_sessions: { Args: { p_all: boolean }; Returns: undefined }
      hc_session_allowed: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
