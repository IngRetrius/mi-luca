// Configuración de ESLint compartida (formato plano).
// Cada paquete la usa con `library({ forbid: [...] })` para declarar qué no puede importar.
// Las reglas de dependencia están explicadas en docs/08-estructura-del-repositorio.md.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const ignores = {
  ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/coverage/**', '**/.turbo/**'],
};

export const base = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

/**
 * Configuración para un paquete de `packages/`.
 * @param {{ forbid?: string[], extraRules?: Record<string, unknown>, node?: boolean }} options
 */
export function library({ forbid = [], extraRules = {}, node = false } = {}) {
  return [
    ...base,
    {
      languageOptions: { globals: node ? globals.node : globals['shared-node-browser'] },
    },
    {
      // Las reglas de dependencia aplican al código del paquete, no a sus archivos de configuración.
      files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}', 'specs/**/*.ts'],
      rules: {
        ...(forbid.length > 0 && {
          'no-restricted-imports': [
            'error',
            {
              patterns: forbid.map((group) => ({
                group: [group],
                message:
                  'Importación prohibida por las reglas de dependencia (docs/08-estructura-del-repositorio.md).',
              })),
            },
          ],
        }),
        ...extraRules,
      },
    },
  ];
}

/** Reglas que garantizan que el motor sea determinista: sin fecha del sistema. */
export const deterministicRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=0]",
      message: 'El motor no usa la fecha del sistema: recibe la fecha de corte como dato.',
    },
    {
      selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
      message: 'El motor no usa la fecha del sistema: recibe la fecha de corte como dato.',
    },
    {
      selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
      message: 'El motor es determinista: no usa números aleatorios.',
    },
  ],
};
