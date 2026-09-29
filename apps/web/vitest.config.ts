import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// El mismo alias `@/` que `paths` en tsconfig.json, para que las pruebas importen como la app.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
