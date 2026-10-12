export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      food_entries: {
        Row: {
          carbs_g: number;
          created_at: string;
          entry_date: string;
          fat_g: number;
          food_id: string | null;
          id: string;
          kcal: number;
          name: string;
          protein_g: number;
          quantity: number;
          raw_input: string | null;
          unit: Database["public"]["Enums"]["quantity_unit"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          carbs_g: number;
          created_at?: string;
          entry_date: string;
          fat_g: number;
          food_id?: string | null;
          id?: string;
          kcal: number;
          name: string;
          protein_g: number;
          quantity: number;
          raw_input?: string | null;
          unit: Database["public"]["Enums"]["quantity_unit"];
          user_id?: string;
        };
        Update: {
          carbs_g?: number;
          created_at?: string;
          entry_date?: string;
          fat_g?: number;
          food_id?: string | null;
          id?: string;
          kcal?: number;
          name?: string;
          protein_g?: number;
          quantity?: number;
          raw_input?: string | null;
          unit?: Database["public"]["Enums"]["quantity_unit"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_entries_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          basis: Database["public"]["Enums"]["nutrition_basis"];
          brand: string | null;
          carbs_g: number;
          created_at: string;
          created_by: string | null;
          fat_g: number;
          id: string;
          kcal: number;
          name: string;
          protein_g: number;
          serving_grams: number | null;
          serving_label: string | null;
          serving_ml: number | null;
          source: Database["public"]["Enums"]["food_source"];
          source_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          basis: Database["public"]["Enums"]["nutrition_basis"];
          brand?: string | null;
          carbs_g: number;
          created_at?: string;
          created_by?: string | null;
          fat_g: number;
          id?: string;
          kcal: number;
          name: string;
          protein_g: number;
          serving_grams?: number | null;
          serving_label?: string | null;
          serving_ml?: number | null;
          source: Database["public"]["Enums"]["food_source"];
          source_url?: string | null;
        };
        Update: {
          basis?: Database["public"]["Enums"]["nutrition_basis"];
          brand?: string | null;
          carbs_g?: number;
          created_at?: string;
          created_by?: string | null;
          fat_g?: number;
          id?: string;
          kcal?: number;
          name?: string;
          protein_g?: number;
          serving_grams?: number | null;
          serving_label?: string | null;
          serving_ml?: number | null;
          source?: Database["public"]["Enums"]["food_source"];
          source_url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          daily_kcal_goal: number | null;
          daily_protein_goal: number | null;
          id: string;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          daily_kcal_goal?: number | null;
          daily_protein_goal?: number | null;
          id: string;
          timezone?: string;
        };
        Update: {
          created_at?: string;
          daily_kcal_goal?: number | null;
          daily_protein_goal?: number | null;
          id?: string;
          timezone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      food_source: "usda" | "openfoodfacts" | "web" | "ai_estimate" | "user";
      nutrition_basis: "per100g" | "per100ml" | "perServing";
      quantity_unit: "g" | "kg" | "ml" | "l" | "serving";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      food_source: ["usda", "openfoodfacts", "web", "ai_estimate", "user"],
      nutrition_basis: ["per100g", "per100ml", "perServing"],
      quantity_unit: ["g", "kg", "ml", "l", "serving"],
    },
  },
} as const;
