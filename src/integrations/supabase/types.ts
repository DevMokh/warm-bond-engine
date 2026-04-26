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
      achievements: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string
          description_ar: string
          icon: string
          id: string
          name_ar: string
          slug: string
          xp_reward: number
        }
        Insert: {
          condition_type: string
          condition_value?: number
          created_at?: string
          description_ar: string
          icon?: string
          id?: string
          name_ar: string
          slug: string
          xp_reward?: number
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string
          description_ar?: string
          icon?: string
          id?: string
          name_ar?: string
          slug?: string
          xp_reward?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          slug: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          slug: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          slug?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          category_id: string | null
          completed_at: string
          correct_answers: number
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          duration_seconds: number | null
          id: string
          mode: Database["public"]["Enums"]["game_mode"]
          score: number
          total_questions: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          category_id?: string | null
          completed_at?: string
          correct_answers?: number
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          duration_seconds?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["game_mode"]
          score?: number
          total_questions?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          category_id?: string | null
          completed_at?: string
          correct_answers?: number
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          duration_seconds?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["game_mode"]
          score?: number
          total_questions?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          games_played: number
          games_won: number
          id: string
          level: number
          total_score: number
          total_xp: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          games_played?: number
          games_won?: number
          id?: string
          level?: number
          total_score?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          games_played?: number
          games_won?: number
          id?: string
          level?: number
          total_score?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          ai_generated: boolean
          category_id: string | null
          correct_answer: number
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          is_active: boolean
          options: Json
          question: string
          times_correct: number
          times_played: number
          updated_at: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          ai_generated?: boolean
          category_id?: string | null
          correct_answer: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_active?: boolean
          options: Json
          question: string
          times_correct?: number
          times_played?: number
          updated_at?: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          ai_generated?: boolean
          category_id?: string | null
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question?: string
          times_correct?: number
          times_played?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      age_group: "youth" | "cultured" | "family"
      app_role: "admin" | "moderator" | "user"
      difficulty_level: "easy" | "medium" | "hard"
      game_mode: "solo" | "daily" | "multiplayer"
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
      age_group: ["youth", "cultured", "family"],
      app_role: ["admin", "moderator", "user"],
      difficulty_level: ["easy", "medium", "hard"],
      game_mode: ["solo", "daily", "multiplayer"],
    },
  },
} as const
