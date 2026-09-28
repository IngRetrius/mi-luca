import { library } from '@miluca/config/eslint';

// ui no conoce el dominio financiero ni Supabase.
export default library({ forbid: ['@miluca/*', '@supabase/*'] });
