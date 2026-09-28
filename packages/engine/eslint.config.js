import { deterministicRules, library } from '@miluca/config/eslint';

// El motor es puro: solo puede importar @miluca/domain (ADR 0004).
export default library({
  forbid: [
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    'next',
    'next/*',
    '@supabase/*',
    'fs',
    'fs/*',
    'node:*',
    '@miluca/ui',
    '@miluca/i18n',
    '@miluca/db',
    '@miluca/exporters',
    '@miluca/web',
  ],
  extraRules: deterministicRules,
});
