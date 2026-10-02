import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Accesibilidad como error: el conjunto recomendado de jsx-a11y (Next.js solo activa seis
      // reglas, como advertencia). El plugin ya lo registra la configuración de Next.js.
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      'react-hooks/exhaustive-deps': 'error',
      // Un módulo de features/ solo se importa por su index (docs/08-estructura-del-repositorio.md).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // `client` es la API pública para componentes de cliente (sin nada de servidor).
              group: ['@/features/*/*', '!@/features/*/client'],
              message:
                'Importa el módulo por su API pública: @/features/<modulo>, o @/features/<modulo>/client desde un componente de cliente.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
