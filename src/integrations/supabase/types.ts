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
      daily_tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          contract_path: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          location: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_type: string
          title: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          contract_path?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          location?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          contract_path?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          location?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_reports: {
        Row: {
          booking_id: string | null
          created_at: string
          description: string
          id: string
          images: string[] | null
          location: string | null
          repair_cost: number | null
          reported_at: string
          severity: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          description: string
          id?: string
          images?: string[] | null
          location?: string | null
          repair_cost?: number | null
          reported_at?: string
          severity?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          description?: string
          id?: string
          images?: string[] | null
          location?: string | null
          repair_cost?: number | null
          reported_at?: string
          severity?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          date: string
          description: string | null
          expense_subcategory: string | null
          id: string
          income_source_specification: string | null
          income_source_type: string | null
          source_section: string | null
          type: Database["public"]["Enums"]["finance_type"]
          updated_at: string
          user_id: string
          vehicle_fuel_type: string | null
          vehicle_id: string | null
          vehicle_year: number | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: string
          created_at?: string
          date?: string
          description?: string | null
          expense_subcategory?: string | null
          id?: string
          income_source_specification?: string | null
          income_source_type?: string | null
          source_section?: string | null
          type: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
          user_id: string
          vehicle_fuel_type?: string | null
          vehicle_id?: string | null
          vehicle_year?: number | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          expense_subcategory?: string | null
          id?: string
          income_source_specification?: string | null
          income_source_type?: string | null
          source_section?: string | null
          type?: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
          user_id?: string
          vehicle_fuel_type?: string | null
          vehicle_id?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_blocks: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          start_date: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_blocks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_type: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rental_bookings: {
        Row: {
          contract_photo_path: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          dropoff_location: string | null
          end_date: string
          id: string
          notes: string | null
          pickup_location: string | null
          pickup_time: string | null
          return_time: string | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          contract_photo_path?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          dropoff_location?: string | null
          end_date: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          return_time?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          contract_photo_path?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          dropoff_location?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          return_time?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          mileage: number | null
          next_date: string | null
          type: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          mileage?: number | null
          next_date?: string | null
          type: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          mileage?: number | null
          next_date?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_reminders: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          title: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          title: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          daily_rate: number | null
          fuel_level: number | null
          fuel_type: string | null
          id: string
          image: string | null
          license_plate: string | null
          make: string
          mileage: number | null
          model: string
          purchase_price: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          daily_rate?: number | null
          fuel_level?: number | null
          fuel_type?: string | null
          id?: string
          image?: string | null
          license_plate?: string | null
          make: string
          mileage?: number | null
          model: string
          purchase_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          daily_rate?: number | null
          fuel_level?: number | null
          fuel_type?: string | null
          id?: string
          image?: string | null
          license_plate?: string | null
          make?: string
          mileage?: number | null
          model?: string
          purchase_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
      finance_type: "income" | "expense"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role: "admin" | "manager" | "user"
      vehicle_status: "available" | "rented" | "maintenance" | "repair"
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
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
      ],
      finance_type: ["income", "expense"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["admin", "manager", "user"],
      vehicle_status: ["available", "rented", "maintenance", "repair"],
    },
  },
} as const
