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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          id: string
          observer_id: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          observer_id: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          observer_id?: string
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_observer_id_fkey"
            columns: ["observer_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: never
          ip: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string
          success?: boolean
        }
        Relationships: []
      }
      mirror_letters: {
        Row: {
          content: string
          created_at: string
          participant_id: string
          voice_path: string | null
        }
        Insert: {
          content: string
          created_at?: string
          participant_id: string
          voice_path?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          participant_id?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mirror_letters_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          ai_comment: string | null
          ai_score: number | null
          body: string
          due_at: string
          id: string
          issued_at: string
          kind: string
          participant_id: string
          reminded_at: string | null
          responded_at: string | null
          response_text: string | null
          scored_at: string | null
          spark_points: number
          status: string
          title: string
          trait_id: number | null
          voice_path: string | null
        }
        Insert: {
          ai_comment?: string | null
          ai_score?: number | null
          body: string
          due_at: string
          id?: string
          issued_at?: string
          kind: string
          participant_id: string
          reminded_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          scored_at?: string | null
          spark_points?: number
          status?: string
          title: string
          trait_id?: number | null
          voice_path?: string | null
        }
        Update: {
          ai_comment?: string | null
          ai_score?: number | null
          body?: string
          due_at?: string
          id?: string
          issued_at?: string
          kind?: string
          participant_id?: string
          reminded_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          scored_at?: string | null
          spark_points?: number
          status?: string
          title?: string
          trait_id?: number | null
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          login_code: string
          phone: string | null
          role: string
          team: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          login_code: string
          phone?: string | null
          role?: string
          team?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          login_code?: string
          phone?: string | null
          role?: string
          team?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          bottom_trait_id: number
          created_at: string
          participant_id: string
          top_trait_id: number
        }
        Insert: {
          bottom_trait_id: number
          created_at?: string
          participant_id: string
          top_trait_id: number
        }
        Update: {
          bottom_trait_id?: number
          created_at?: string
          participant_id?: string
          top_trait_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictions_bottom_trait_id_fkey"
            columns: ["bottom_trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_top_trait_id_fkey"
            columns: ["top_trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          participant_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          participant_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_self: boolean | null
          rater_id: string
          score: number
          target_id: string
          trait_id: number
          wave: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_self?: boolean | null
          rater_id: string
          score: number
          target_id: string
          trait_id: number
          wave: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_self?: boolean | null
          rater_id?: string
          score?: number
          target_id?: string
          trait_id?: number
          wave?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_wave_fkey"
            columns: ["wave"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          created_at: string
          id: string
          location: string | null
          reveal_minutes: number
          revealed: boolean
          starts_at: string
          teaser: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          reveal_minutes?: number
          revealed?: boolean
          starts_at: string
          teaser?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          reveal_minutes?: number
          revealed?: boolean
          starts_at?: string
          teaser?: string | null
          title?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      traits: {
        Row: {
          active: boolean
          id: number
          name: string
          observation_hint: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: number
          name: string
          observation_hint: string
          sort_order: number
        }
        Update: {
          active?: boolean
          id?: number
          name?: string
          observation_hint?: string
          sort_order?: number
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          beklenti: string | null
          consent: boolean
          created_at: string
          face_path: string | null
          greeting_path: string | null
          participant_id: string
          sample_path: string | null
          soz_path: string | null
          status: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          beklenti?: string | null
          consent?: boolean
          created_at?: string
          face_path?: string | null
          greeting_path?: string | null
          participant_id: string
          sample_path?: string | null
          soz_path?: string | null
          status?: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          beklenti?: string | null
          consent?: boolean
          created_at?: string
          face_path?: string | null
          greeting_path?: string | null
          participant_id?: string
          sample_path?: string | null
          soz_path?: string | null
          status?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      waves: {
        Row: {
          closed_at: string | null
          id: number
          is_open: boolean
          name: string
          opened_at: string | null
        }
        Insert: {
          closed_at?: string | null
          id: number
          is_open?: boolean
          name: string
          opened_at?: string | null
        }
        Update: {
          closed_at?: string | null
          id?: number
          is_open?: boolean
          name?: string
          opened_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
