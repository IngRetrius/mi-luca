// Tipos de la base de datos. `database.types.ts` lo genera `pnpm db:types` desde el esquema local
// (Supabase local encendido y migraciones aplicadas); no se edita a mano.

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types';
