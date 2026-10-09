import type { Metadata, Viewport } from 'next';
import { Livvic } from 'next/font/google';

import { darkTheme, lightTheme, themeToCssVariables } from '@miluca/ui';

import { ErrorTextProvider } from '@/components/error-text';
import { siteUrl } from '@/lib/site-url';
import { getBaseMessages, getLanguage } from '@/server/i18n';

import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getBaseMessages();
  return {
    // Base de las direcciones absolutas: la imagen para compartir y la URL canónica del landing.
    metadataBase: siteUrl(),
    title: t.app.name,
    description: t.app.tagline,
    applicationName: t.app.name,
    appleWebApp: {
      capable: true,
      title: t.app.name,
      statusBarStyle: 'default',
    },
    formatDetection: { telephone: false },
  };
}

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

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [language, t] = await Promise.all([getLanguage(), getBaseMessages()]);
  return (
    <html lang={language} className={`${livvic.variable} h-full antialiased`}>
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorTextProvider text={t.common.error}>{children}</ErrorTextProvider>
      </body>
    </html>
  );
}
