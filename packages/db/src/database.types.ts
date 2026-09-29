export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      advisor_client_access: {
        Row: {
          advisor_id: string;
          client_id: string;
          granted_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          status: string;
        };
        Insert: {
          advisor_id: string;
          client_id: string;
          granted_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
        };
        Update: {
          advisor_id?: string;
          client_id?: string;
          granted_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'advisor_client_access_advisor_id_fkey';
            columns: ['advisor_id'];
            isOneToOne: false;
            referencedRelation: 'advisors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'advisor_client_access_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      advisors: {
        Row: {
          brand_name: string | null;
          created_at: string;
          display_name: string;
          id: string;
          user_id: string;
        };
        Insert: {
          brand_name?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          user_id: string;
        };
        Update: {
          brand_name?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_role: string | null;
          actor_user_id: string | null;
          changed_cols: string[] | null;
          client_id: string | null;
          id: number;
          new_values: Json | null;
          occurred_at: string;
          old_values: Json | null;
          row_pk: NonNullable<Json>;
          table_name: string;
        };
        Insert: {
          action: string;
          actor_role?: string | null;
          actor_user_id?: string | null;
          changed_cols?: string[] | null;
          client_id?: string | null;
          id?: never;
          new_values?: Json | null;
          occurred_at?: string;
          old_values?: Json | null;
          row_pk: NonNullable<Json>;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_role?: string | null;
          actor_user_id?: string | null;
          changed_cols?: string[] | null;
          client_id?: string | null;
          id?: never;
          new_values?: Json | null;
          occurred_at?: string;
          old_values?: Json | null;
          row_pk?: NonNullable<Json>;
          table_name?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          base_currency: string;
          birth_date: string | null;
          client_type: string | null;
          country_code: string;
          created_at: string;
          created_by: string;
          deletion_requested_at: string | null;
          dependents_count: number;
          display_name: string;
          form_of_address: string;
          id: string;
          locale: string;
          owner_user_id: string | null;
          sex: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          base_currency: string;
          birth_date?: string | null;
          client_type?: string | null;
          country_code: string;
          created_at?: string;
          created_by: string;
          deletion_requested_at?: string | null;
          dependents_count?: number;
          display_name: string;
          form_of_address?: string;
          id?: string;
          locale?: string;
          owner_user_id?: string | null;
          sex?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          base_currency?: string;
          birth_date?: string | null;
          client_type?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string;
          deletion_requested_at?: string | null;
          dependents_count?: number;
          display_name?: string;
          form_of_address?: string;
          id?: string;
          locale?: string;
          owner_user_id?: string | null;
          sex?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      consents: {
        Row: {
          client_id: string;
          granted: boolean;
          id: string;
          legal_text_id: string;
          recorded_at: string;
          user_agent: string | null;
          user_id: string;
          withdrawn_at: string | null;
        };
        Insert: {
          client_id: string;
          granted: boolean;
          id?: string;
          legal_text_id: string;
          recorded_at?: string;
          user_agent?: string | null;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          client_id?: string;
          granted?: boolean;
          id?: string;
          legal_text_id?: string;
          recorded_at?: string;
          user_agent?: string | null;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'consents_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consents_legal_text_id_fkey';
            columns: ['legal_text_id'];
            isOneToOne: false;
            referencedRelation: 'legal_texts';
            referencedColumns: ['id'];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          default_currency: string;
          default_locale: string;
          enabled: boolean;
          name: string;
          pension_module: string | null;
        };
        Insert: {
          code: string;
          default_currency: string;
          default_locale: string;
          enabled?: boolean;
          name: string;
          pension_module?: string | null;
        };
        Update: {
          code?: string;
          default_currency?: string;
          default_locale?: string;
          enabled?: boolean;
          name?: string;
          pension_module?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          advisor_id: string;
          client_id: string;
          created_at: string;
          email: string | null;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          advisor_id?: string;
          client_id: string;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          advisor_id?: string;
          client_id?: string;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_advisor_id_fkey';
            columns: ['advisor_id'];
            isOneToOne: false;
            referencedRelation: 'advisors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      legal_texts: {
        Row: {
          body_markdown: string;
          body_sha256: string;
          country_code: string | null;
          id: string;
          kind: string;
          locale: string;
          published_at: string;
          title: string;
          version: string;
        };
        Insert: {
          body_markdown: string;
          body_sha256: string;
          country_code?: string | null;
          id?: string;
          kind: string;
          locale?: string;
          published_at?: string;
          title: string;
          version: string;
        };
        Update: {
          body_markdown?: string;
          body_sha256?: string;
          country_code?: string | null;
          id?: string;
          kind?: string;
          locale?: string;
          published_at?: string;
          title?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'legal_texts_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      notifications: {
        Row: {
          client_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          recipient_user_id: string;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          recipient_user_id: string;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          recipient_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: {
        Args: { p_granted_texts?: string[]; p_token: string; p_user_agent?: string };
        Returns: string;
      };
      create_client: {
        Args: {
          p_base_currency?: string;
          p_country_code: string;
          p_display_name: string;
          p_form_of_address?: string;
        };
        Returns: string;
      };
      current_legal_texts: {
        Args: { p_country_code: string };
        Returns: {
          body_markdown: string;
          body_sha256: string;
          country_code: string | null;
          id: string;
          kind: string;
          locale: string;
          published_at: string;
          title: string;
          version: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'legal_texts';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          advisor_name: string;
          client_name: string;
          country_code: string;
          email: string;
          expires_at: string;
          form_of_address: string;
          status: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
