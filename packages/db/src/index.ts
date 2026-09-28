// Tipos de la base de datos. Se reemplaza por el archivo que genera `supabase gen types`
// cuando existan las primeras migraciones (fase 1).

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
