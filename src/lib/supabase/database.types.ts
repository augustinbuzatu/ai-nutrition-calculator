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
      ai_access: {
        Row: {
          approved_at: string;
          note: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          approved_at?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_limits: {
        Row: {
          descriptions_per_day: number;
          descriptions_per_user: number;
          lookups_per_day: number;
          lookups_per_user: number;
          only_row: boolean;
        };
        ComputedFields: never;
        Insert: {
          descriptions_per_day?: number;
          descriptions_per_user?: number;
          lookups_per_day?: number;
          lookups_per_user?: number;
          only_row?: boolean;
        };
        Update: {
          descriptions_per_day?: number;
          descriptions_per_user?: number;
          lookups_per_day?: number;
          lookups_per_user?: number;
          only_row?: boolean;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          day: string;
          kind: Database["public"]["Enums"]["ai_use"];
          user_id: string | null;
          uses: number;
        };
        ComputedFields: never;
        Insert: {
          day: string;
          kind: Database["public"]["Enums"]["ai_use"];
          user_id?: string | null;
          uses?: number;
        };
        Update: {
          day?: string;
          kind?: Database["public"]["Enums"]["ai_use"];
          user_id?: string | null;
          uses?: number;
        };
        Relationships: [];
      };
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
          search_text: string | null;
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
          search_text?: never;
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
          search_text?: never;
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
      ai_allowance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          approved: boolean;
          descriptions_left: number;
          lookups_left: number;
        }[];
      };
      ai_day: { Args: Record<PropertyKey, never>; Returns: string };
      food_search_text: {
        Args: { brand: string; name: string };
        Returns: string;
      };
      search_foods: {
        Args: { max_results?: number; query: string };
        Returns: {
          basis: Database["public"]["Enums"]["nutrition_basis"];
          brand: string;
          carbs_g: number;
          fat_g: number;
          id: string;
          kcal: number;
          name: string;
          protein_g: number;
          serving_grams: number;
          serving_label: string;
          serving_ml: number;
          similarity: number;
          source: Database["public"]["Enums"]["food_source"];
          source_url: string;
        }[];
      };
      use_ai: {
        Args: { use_kind: Database["public"]["Enums"]["ai_use"] };
        Returns: string;
      };
    };
    Enums: {
      ai_use: "description" | "lookup";
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
      ai_use: ["description", "lookup"],
      food_source: ["usda", "openfoodfacts", "web", "ai_estimate", "user"],
      nutrition_basis: ["per100g", "per100ml", "perServing"],
      quantity_unit: ["g", "kg", "ml", "l", "serving"],
    },
  },
} as const;
