export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      action_items: {
        Row: {
          client_id: string;
          completed_at: string | null;
          completed_by: string | null;
          due_date: string | null;
          id: string;
          note: string | null;
          owner_role: string;
          priority: string;
          sort_order: number;
          status: string;
          suggestion_key: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          completed_at?: string | null;
          completed_by?: string | null;
          due_date?: string | null;
          id?: string;
          note?: string | null;
          owner_role: string;
          priority: string;
          sort_order?: number;
          status?: string;
          suggestion_key?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          due_date?: string | null;
          id?: string;
          note?: string | null;
          owner_role?: string;
          priority?: string;
          sort_order?: number;
          status?: string;
          suggestion_key?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'action_items_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
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
      assets: {
        Row: {
          asset_type: string;
          client_id: string;
          currency: string;
          generates_income: boolean;
          id: string;
          name: string;
          note: string | null;
          pocket_id: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          value: number;
        };
        Insert: {
          asset_type: string;
          client_id: string;
          currency: string;
          generates_income?: boolean;
          id?: string;
          name: string;
          note?: string | null;
          pocket_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value: number;
        };
        Update: {
          asset_type?: string;
          client_id?: string;
          currency?: string;
          generates_income?: boolean;
          id?: string;
          name?: string;
          note?: string | null;
          pocket_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assets_pocket_id_client_id_fkey';
            columns: ['pocket_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'pockets';
            referencedColumns: ['id', 'client_id'];
          },
        ];
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
      banks: {
        Row: {
          client_id: string;
          id: string;
          is_remunerated: boolean;
          max_pockets: number | null;
          name: string;
          note: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          id?: string;
          is_remunerated?: boolean;
          max_pockets?: number | null;
          name: string;
          note?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          id?: string;
          is_remunerated?: boolean;
          max_pockets?: number | null;
          name?: string;
          note?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'banks_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      budget_items: {
        Row: {
          amount: number | null;
          basic_amount: number | null;
          category: string;
          client_id: string;
          concept: string;
          currency: string;
          duration_days: number | null;
          essential: boolean;
          expense_type: string | null;
          frequency: string | null;
          id: string;
          is_health: boolean;
          is_proposed: boolean;
          is_temporary: boolean;
          note: string | null;
          payer: string;
          payer_label: string | null;
          pocket_id: string | null;
          scope: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount?: number | null;
          basic_amount?: number | null;
          category: string;
          client_id: string;
          concept: string;
          currency: string;
          duration_days?: number | null;
          essential?: boolean;
          expense_type?: string | null;
          frequency?: string | null;
          id?: string;
          is_health?: boolean;
          is_proposed?: boolean;
          is_temporary?: boolean;
          note?: string | null;
          payer?: string;
          payer_label?: string | null;
          pocket_id?: string | null;
          scope?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number | null;
          basic_amount?: number | null;
          category?: string;
          client_id?: string;
          concept?: string;
          currency?: string;
          duration_days?: number | null;
          essential?: boolean;
          expense_type?: string | null;
          frequency?: string | null;
          id?: string;
          is_health?: boolean;
          is_proposed?: boolean;
          is_temporary?: boolean;
          note?: string | null;
          payer?: string;
          payer_label?: string | null;
          pocket_id?: string | null;
          scope?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'budget_items_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budget_items_pocket_id_client_id_fkey';
            columns: ['pocket_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'pockets';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      case_settings: {
        Row: {
          client_id: string;
          compatibility_mode: boolean;
          cutoff_date: string | null;
          debt_method: string;
          emergency_months_override: number | null;
          expensive_debt_threshold: number | null;
          fiscal_threshold_keys: string[];
          flow_year: number | null;
          growth_floor: number | null;
          growth_glide_step: number | null;
          insurance_pocket_id: string | null;
          life_annual_to_cover: number | null;
          life_support_years: number | null;
          operating_cushion: number;
          pct_excess_to_invest: number | null;
          pct_surplus_invest_confirmed: number | null;
          pct_surplus_invest_pending: number | null;
          pct_surplus_to_debt: number | null;
          real_return_growth: number | null;
          real_return_stability: number | null;
          retirement_age: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          compatibility_mode?: boolean;
          cutoff_date?: string | null;
          debt_method?: string;
          emergency_months_override?: number | null;
          expensive_debt_threshold?: number | null;
          fiscal_threshold_keys?: string[];
          flow_year?: number | null;
          growth_floor?: number | null;
          growth_glide_step?: number | null;
          insurance_pocket_id?: string | null;
          life_annual_to_cover?: number | null;
          life_support_years?: number | null;
          operating_cushion?: number;
          pct_excess_to_invest?: number | null;
          pct_surplus_invest_confirmed?: number | null;
          pct_surplus_invest_pending?: number | null;
          pct_surplus_to_debt?: number | null;
          real_return_growth?: number | null;
          real_return_stability?: number | null;
          retirement_age?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          compatibility_mode?: boolean;
          cutoff_date?: string | null;
          debt_method?: string;
          emergency_months_override?: number | null;
          expensive_debt_threshold?: number | null;
          fiscal_threshold_keys?: string[];
          flow_year?: number | null;
          growth_floor?: number | null;
          growth_glide_step?: number | null;
          insurance_pocket_id?: string | null;
          life_annual_to_cover?: number | null;
          life_support_years?: number | null;
          operating_cushion?: number;
          pct_excess_to_invest?: number | null;
          pct_surplus_invest_confirmed?: number | null;
          pct_surplus_invest_pending?: number | null;
          pct_surplus_to_debt?: number | null;
          real_return_growth?: number | null;
          real_return_stability?: number | null;
          retirement_age?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'case_settings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_settings_insurance_pocket_id_client_id_fkey';
            columns: ['insurance_pocket_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'pockets';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      change_impacts: {
        Row: {
          actor_role: string;
          actor_user_id: string;
          after_figures: NonNullable<Json>;
          audit_from_id: number;
          audit_to_id: number;
          before_figures: NonNullable<Json>;
          client_id: string;
          created_at: string;
          deltas: NonNullable<Json>;
          engine_version: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          actor_role: string;
          actor_user_id: string;
          after_figures: NonNullable<Json>;
          audit_from_id: number;
          audit_to_id: number;
          before_figures: NonNullable<Json>;
          client_id: string;
          created_at?: string;
          deltas: NonNullable<Json>;
          engine_version: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          actor_role?: string;
          actor_user_id?: string;
          after_figures?: NonNullable<Json>;
          audit_from_id?: number;
          audit_to_id?: number;
          before_figures?: NonNullable<Json>;
          client_id?: string;
          created_at?: string;
          deltas?: NonNullable<Json>;
          engine_version?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'change_impacts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_documents: {
        Row: {
          client_id: string;
          content: NonNullable<Json>;
          id: string;
          kind: string;
          published_at: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          content?: NonNullable<Json>;
          id?: string;
          kind: string;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          content?: NonNullable<Json>;
          id?: string;
          kind?: string;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_documents_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_fx_rates: {
        Row: {
          as_of: string;
          client_id: string;
          currency: string;
          note: string | null;
          rate_to_base: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          as_of: string;
          client_id: string;
          currency: string;
          note?: string | null;
          rate_to_base: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          as_of?: string;
          client_id?: string;
          currency?: string;
          note?: string | null;
          rate_to_base?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_fx_rates_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_key_figures: {
        Row: {
          client_id: string;
          computed_at: string;
          engine_version: string;
          figures: NonNullable<Json>;
          mode: string;
        };
        Insert: {
          client_id: string;
          computed_at?: string;
          engine_version: string;
          figures: NonNullable<Json>;
          mode: string;
        };
        Update: {
          client_id?: string;
          computed_at?: string;
          engine_version?: string;
          figures?: NonNullable<Json>;
          mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_key_figures_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
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
      continuity_notes: {
        Row: {
          beneficiaries_reviewed: boolean | null;
          client_id: string;
          decisions: string;
          has_will: boolean | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          beneficiaries_reviewed?: boolean | null;
          client_id: string;
          decisions?: string;
          has_will?: boolean | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          beneficiaries_reviewed?: boolean | null;
          client_id?: string;
          decisions?: string;
          has_will?: boolean | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'continuity_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
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
        };
        Insert: {
          code: string;
          default_currency: string;
          default_locale: string;
          enabled?: boolean;
          name: string;
        };
        Update: {
          code?: string;
          default_currency?: string;
          default_locale?: string;
          enabled?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      country_parameters: {
        Row: {
          consulted_at: string;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          key: string;
          notes: string | null;
          source_name: string;
          source_url: string | null;
          unit: string | null;
          valid_from: string;
          valid_to: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          consulted_at: string;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key: string;
          notes?: string | null;
          source_name: string;
          source_url?: string | null;
          unit?: string | null;
          valid_from: string;
          valid_to?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          consulted_at?: string;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key?: string;
          notes?: string | null;
          source_name?: string;
          source_url?: string | null;
          unit?: string | null;
          valid_from?: string;
          valid_to?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'country_parameters_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      debt_installments: {
        Row: {
          client_id: string;
          custom_payment: number | null;
          debt_id: string;
          extra_payment: number | null;
          installment_number: number;
          paid: boolean;
          paid_on: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          custom_payment?: number | null;
          debt_id: string;
          extra_payment?: number | null;
          installment_number: number;
          paid?: boolean;
          paid_on?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          custom_payment?: number | null;
          debt_id?: string;
          extra_payment?: number | null;
          installment_number?: number;
          paid?: boolean;
          paid_on?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'debt_installments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'debt_installments_debt_id_client_id_fkey';
            columns: ['debt_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'debts';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      debts: {
        Row: {
          accepts_extra: boolean;
          annual_rate: number;
          balance: number;
          client_id: string;
          currency: string;
          debt_type: string;
          extra_from_date: string | null;
          extra_from_installment: number | null;
          first_installment_date: string | null;
          first_installment_number: number;
          frech_points: number | null;
          frech_until_installment: number | null;
          id: string;
          insurance_in_payment: number;
          lender_name: string | null;
          manual_order: number | null;
          min_payment: number;
          name: string;
          note: string | null;
          original_amount: number | null;
          sort_order: number;
          total_installments: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accepts_extra?: boolean;
          annual_rate: number;
          balance: number;
          client_id: string;
          currency: string;
          debt_type: string;
          extra_from_date?: string | null;
          extra_from_installment?: number | null;
          first_installment_date?: string | null;
          first_installment_number?: number;
          frech_points?: number | null;
          frech_until_installment?: number | null;
          id?: string;
          insurance_in_payment?: number;
          lender_name?: string | null;
          manual_order?: number | null;
          min_payment: number;
          name: string;
          note?: string | null;
          original_amount?: number | null;
          sort_order?: number;
          total_installments?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accepts_extra?: boolean;
          annual_rate?: number;
          balance?: number;
          client_id?: string;
          currency?: string;
          debt_type?: string;
          extra_from_date?: string | null;
          extra_from_installment?: number | null;
          first_installment_date?: string | null;
          first_installment_number?: number;
          frech_points?: number | null;
          frech_until_installment?: number | null;
          id?: string;
          insurance_in_payment?: number;
          lender_name?: string | null;
          manual_order?: number | null;
          min_payment?: number;
          name?: string;
          note?: string | null;
          original_amount?: number | null;
          sort_order?: number;
          total_installments?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'debts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      goal_trip_items: {
        Row: {
          client_id: string;
          concept: string;
          goal_id: string;
          id: string;
          is_lodging: boolean;
          quantity: number;
          sort_order: number;
          unit_value: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          concept: string;
          goal_id: string;
          id?: string;
          is_lodging?: boolean;
          quantity?: number;
          sort_order?: number;
          unit_value: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          concept?: string;
          goal_id?: string;
          id?: string;
          is_lodging?: boolean;
          quantity?: number;
          sort_order?: number;
          unit_value?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'goal_trip_items_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goal_trip_items_goal_id_client_id_fkey';
            columns: ['goal_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      goals: {
        Row: {
          already_saved: number;
          amount: number | null;
          client_id: string;
          currency: string;
          id: string;
          name: string;
          note: string | null;
          pocket_id: string | null;
          repeat_every_years: number | null;
          sort_order: number;
          target_date: string | null;
          trip_base_costs: number;
          trip_currency: string | null;
          trip_cushion_rate: number;
          trip_lodging_tax_rate: number;
          updated_at: string;
          updated_by: string | null;
          uses_trip_calculator: boolean;
        };
        Insert: {
          already_saved?: number;
          amount?: number | null;
          client_id: string;
          currency: string;
          id?: string;
          name: string;
          note?: string | null;
          pocket_id?: string | null;
          repeat_every_years?: number | null;
          sort_order?: number;
          target_date?: string | null;
          trip_base_costs?: number;
          trip_currency?: string | null;
          trip_cushion_rate?: number;
          trip_lodging_tax_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
          uses_trip_calculator?: boolean;
        };
        Update: {
          already_saved?: number;
          amount?: number | null;
          client_id?: string;
          currency?: string;
          id?: string;
          name?: string;
          note?: string | null;
          pocket_id?: string | null;
          repeat_every_years?: number | null;
          sort_order?: number;
          target_date?: string | null;
          trip_base_costs?: number;
          trip_currency?: string | null;
          trip_cushion_rate?: number;
          trip_lodging_tax_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
          uses_trip_calculator?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goals_pocket_id_client_id_fkey';
            columns: ['pocket_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'pockets';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      incomes: {
        Row: {
          allocation: string;
          amount: number;
          client_id: string;
          currency: string;
          id: string;
          is_net: boolean;
          kind: string;
          lost_in_scenario: string | null;
          name: string;
          note: string | null;
          payments_by_month: number[];
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allocation?: string;
          amount: number;
          client_id: string;
          currency: string;
          id?: string;
          is_net?: boolean;
          kind: string;
          lost_in_scenario?: string | null;
          name: string;
          note?: string | null;
          payments_by_month?: number[];
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allocation?: string;
          amount?: number;
          client_id?: string;
          currency?: string;
          id?: string;
          is_net?: boolean;
          kind?: string;
          lost_in_scenario?: string | null;
          name?: string;
          note?: string | null;
          payments_by_month?: number[];
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'incomes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      insurances: {
        Row: {
          annual_premium_quoted: number | null;
          beneficiaries_note: string | null;
          client_id: string;
          currency: string;
          custom_name: string | null;
          id: string;
          insurance_type: string;
          note: string | null;
          sort_order: number;
          status: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          annual_premium_quoted?: number | null;
          beneficiaries_note?: string | null;
          client_id: string;
          currency: string;
          custom_name?: string | null;
          id?: string;
          insurance_type: string;
          note?: string | null;
          sort_order?: number;
          status?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          annual_premium_quoted?: number | null;
          beneficiaries_note?: string | null;
          client_id?: string;
          currency?: string;
          custom_name?: string | null;
          id?: string;
          insurance_type?: string;
          note?: string | null;
          sort_order?: number;
          status?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'insurances_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      investments: {
        Row: {
          balance: number;
          bucket: string | null;
          client_id: string;
          currency: string;
          id: string;
          name: string;
          note: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          balance: number;
          bucket?: string | null;
          client_id: string;
          currency: string;
          id?: string;
          name: string;
          note?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          balance?: number;
          bucket?: string | null;
          client_id?: string;
          currency?: string;
          id?: string;
          name?: string;
          note?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'investments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
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
      monthly_control_entries: {
        Row: {
          amount: number;
          category: string;
          client_id: string;
          currency: string;
          month: number;
          updated_at: string;
          updated_by: string | null;
          year: number;
        };
        Insert: {
          amount: number;
          category: string;
          client_id: string;
          currency: string;
          month: number;
          updated_at?: string;
          updated_by?: string | null;
          year: number;
        };
        Update: {
          amount?: number;
          category?: string;
          client_id?: string;
          currency?: string;
          month?: number;
          updated_at?: string;
          updated_by?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_control_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
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
      plan_deliveries: {
        Row: {
          client_id: string;
          cutoff_date: string;
          delivered_at: string;
          delivered_by: string | null;
          documents: NonNullable<Json>;
          engine_version: string;
          id: string;
          inputs: NonNullable<Json>;
          key_figures: NonNullable<Json>;
          label: string;
          labels: NonNullable<Json>;
          mode: string;
          parameter_ids: string[];
          pdf_path: string | null;
          qc_report: NonNullable<Json>;
          results: NonNullable<Json>;
          sha256: string;
        };
        Insert: {
          client_id: string;
          cutoff_date: string;
          delivered_at?: string;
          delivered_by?: string | null;
          documents?: NonNullable<Json>;
          engine_version: string;
          id?: string;
          inputs: NonNullable<Json>;
          key_figures: NonNullable<Json>;
          label: string;
          labels?: NonNullable<Json>;
          mode: string;
          parameter_ids?: string[];
          pdf_path?: string | null;
          qc_report: NonNullable<Json>;
          results: NonNullable<Json>;
          sha256?: string;
        };
        Update: {
          client_id?: string;
          cutoff_date?: string;
          delivered_at?: string;
          delivered_by?: string | null;
          documents?: NonNullable<Json>;
          engine_version?: string;
          id?: string;
          inputs?: NonNullable<Json>;
          key_figures?: NonNullable<Json>;
          label?: string;
          labels?: NonNullable<Json>;
          mode?: string;
          parameter_ids?: string[];
          pdf_path?: string | null;
          qc_report?: NonNullable<Json>;
          results?: NonNullable<Json>;
          sha256?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_deliveries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      pockets: {
        Row: {
          bank_id: string | null;
          client_id: string;
          currency: string;
          id: string;
          initial_balance: number | null;
          kind: string;
          name: string;
          purpose: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          when_used: string | null;
        };
        Insert: {
          bank_id?: string | null;
          client_id: string;
          currency: string;
          id?: string;
          initial_balance?: number | null;
          kind?: string;
          name: string;
          purpose?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          when_used?: string | null;
        };
        Update: {
          bank_id?: string | null;
          client_id?: string;
          currency?: string;
          id?: string;
          initial_balance?: number | null;
          kind?: string;
          name?: string;
          purpose?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          when_used?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pockets_bank_id_client_id_fkey';
            columns: ['bank_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'banks';
            referencedColumns: ['id', 'client_id'];
          },
          {
            foreignKeyName: 'pockets_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_adjustments: {
        Row: {
          amount: number | null;
          applied: boolean;
          budget_item_id: string | null;
          client_id: string;
          concept: string;
          currency: string;
          decision: string;
          frequency: string | null;
          from_amount: number | null;
          id: string;
          kind: string;
          proposal_id: string;
          reason: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount?: number | null;
          applied?: boolean;
          budget_item_id?: string | null;
          client_id: string;
          concept: string;
          currency: string;
          decision?: string;
          frequency?: string | null;
          from_amount?: number | null;
          id?: string;
          kind: string;
          proposal_id: string;
          reason?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number | null;
          applied?: boolean;
          budget_item_id?: string | null;
          client_id?: string;
          concept?: string;
          currency?: string;
          decision?: string;
          frequency?: string | null;
          from_amount?: number | null;
          id?: string;
          kind?: string;
          proposal_id?: string;
          reason?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'proposal_adjustments_budget_item_id_client_id_fkey';
            columns: ['budget_item_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'budget_items';
            referencedColumns: ['id', 'client_id'];
          },
          {
            foreignKeyName: 'proposal_adjustments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_adjustments_proposal_id_client_id_fkey';
            columns: ['proposal_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id', 'client_id'];
          },
        ];
      };
      proposals: {
        Row: {
          after_figures: Json | null;
          applied_at: string | null;
          applied_by: string | null;
          before_figures: Json | null;
          client_id: string;
          created_at: string;
          id: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          after_figures?: Json | null;
          applied_at?: string | null;
          applied_by?: string | null;
          before_figures?: Json | null;
          client_id: string;
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          after_figures?: Json | null;
          applied_at?: string | null;
          applied_by?: string | null;
          before_figures?: Json | null;
          client_id?: string;
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'proposals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      reality_check: {
        Row: {
          client_id: string;
          currency: string;
          n_months: number | null;
          savings_n_ago: number | null;
          savings_today: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          currency: string;
          n_months?: number | null;
          savings_n_ago?: number | null;
          savings_today?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          currency?: string;
          n_months?: number | null;
          savings_n_ago?: number | null;
          savings_today?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reality_check_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      receivables: {
        Row: {
          balance: number;
          client_id: string;
          currency: string;
          debtor_label: string;
          first_payment_date: string | null;
          id: string;
          monthly_payment: number;
          note: string | null;
          pct_to_investment: number;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          balance: number;
          client_id: string;
          currency: string;
          debtor_label: string;
          first_payment_date?: string | null;
          id?: string;
          monthly_payment: number;
          note?: string | null;
          pct_to_investment?: number;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          balance?: number;
          client_id?: string;
          currency?: string;
          debtor_label?: string;
          first_payment_date?: string | null;
          id?: string;
          monthly_payment?: number;
          note?: string | null;
          pct_to_investment?: number;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'receivables_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      risk_profile: {
        Row: {
          client_id: string;
          dependents_override: boolean | null;
          drop_reaction: string | null;
          experience: string | null;
          horizon: string | null;
          range_position: number;
          updated_at: string;
          updated_by: string | null;
          variable_income_override: boolean | null;
        };
        Insert: {
          client_id: string;
          dependents_override?: boolean | null;
          drop_reaction?: string | null;
          experience?: string | null;
          horizon?: string | null;
          range_position?: number;
          updated_at?: string;
          updated_by?: string | null;
          variable_income_override?: boolean | null;
        };
        Update: {
          client_id?: string;
          dependents_override?: boolean | null;
          drop_reaction?: string | null;
          experience?: string | null;
          horizon?: string | null;
          range_position?: number;
          updated_at?: string;
          updated_by?: string | null;
          variable_income_override?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'risk_profile_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      social_security_months: {
        Row: {
          client_id: string;
          payments_by_month: number[];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          client_id: string;
          payments_by_month?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          payments_by_month?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'social_security_months_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      variable_income_history: {
        Row: {
          amount: number;
          client_id: string;
          currency: string;
          month_index: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount: number;
          client_id: string;
          currency: string;
          month_index: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string;
          currency?: string;
          month_index?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'variable_income_history_client_id_fkey';
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
      apply_proposal: {
        Args: { p_after: Json; p_before: Json; p_proposal: string; p_tasks: Json };
        Returns: undefined;
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
      parameter_at: {
        Args: { p_country: string; p_key: string; p_on: string };
        Returns: {
          consulted_at: string;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          key: string;
          notes: string | null;
          source_name: string;
          source_url: string | null;
          unit: string | null;
          valid_from: string;
          valid_to: string | null;
          value: NonNullable<Json>;
        };
        SetofOptions: {
          from: '*';
          to: 'country_parameters';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_change_impact: {
        Args: {
          p_after: Json;
          p_audit_after: number;
          p_before: Json;
          p_client: string;
          p_deltas: Json;
          p_engine_version: string;
          p_impact?: string;
          p_mode: string;
        };
        Returns: string;
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
