import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'es-CO',
    trace: 'retain-on-failure',
  },
  // Primero el celular: todas las pruebas corren en iPhone y Android. El diseño adaptable (ADR 0023)
  // se prueba además en tableta y escritorio.
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: /(adaptable|idioma)\.spec\.ts/,
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(adaptable|idioma)\.spec\.ts/,
    },
  ],
  webServer: {
    // Se llama a Next.js con Node directamente: si se arranca con pnpm, la señal de cierre no llega
    // al servidor y Playwright se queda esperando al terminar.
    command: `node node_modules/next/dist/bin/next start --port ${port}`,
    cwd: '../../apps/web',
    url: `http://localhost:${port}`,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
