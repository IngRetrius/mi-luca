import type { MetadataRoute } from 'next';

import { lightTheme } from '@miluca/ui';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MiLuca',
    short_name: 'MiLuca',
    description: 'Planificación financiera personal',
    lang: 'es',
    // La app instalada abre en Entrar, que con sesión sigue al inicio de cada rol: nunca muestra
    // el landing público de la raíz (ADR 0026).
    start_url: '/entrar',
    scope: '/',
    display: 'standalone',
    // Cualquier orientación: en tableta y escritorio la app instalada también gira (ADR 0023).
    orientation: 'any',
    background_color: lightTheme.bg,
    theme_color: lightTheme.primary,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
