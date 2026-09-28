import { library } from '@miluca/config/eslint';

// Los exportadores reciben todo calculado: no consultan la base de datos.
export default library({ forbid: ['@supabase/*', '@miluca/db', '@miluca/ui', '@miluca/web'] });
