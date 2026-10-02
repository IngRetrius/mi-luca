import type { Metadata, Viewport } from 'next';
import { Livvic } from 'next/font/google';

import { messages } from '@miluca/i18n';
import { darkTheme, lightTheme, themeToCssVariables } from '@miluca/ui';

import { ErrorTextProvider } from '@/components/error-text';

import './globals.css';

export const metadata: Metadata = {
  title: 'MiLuca',
  description: 'Planificación financiera personal',
  applicationName: 'MiLuca',
  appleWebApp: {
    capable: true,
    title: 'MiLuca',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pantalla completa en iPhone: el contenido respeta las áreas seguras con env(safe-area-inset-*).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: lightTheme.bg },
    { media: '(prefers-color-scheme: dark)', color: darkTheme.bg },
  ],
};

// Tokens de packages/ui como variables CSS: una sola fuente para colores y contrastes.
const themeCss = `:root{${themeToCssVariables(lightTheme)}}
@media (prefers-color-scheme: dark){:root{${themeToCssVariables(darkTheme)}}}`;

// Tipografía de la marca (docs/diseno/tokens.md, sección 4). next/font la descarga al construir y
// la sirve desde el mismo dominio: el navegador no le pide nada a Google. Solo los pesos en uso.
const livvic = Livvic({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-livvic',
});

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${livvic.variable} h-full antialiased`}>
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorTextProvider text={messages.es.common.error}>{children}</ErrorTextProvider>
      </body>
    </html>
  );
}
