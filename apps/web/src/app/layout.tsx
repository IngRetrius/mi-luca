import type { Metadata, Viewport } from 'next';
import { Livvic } from 'next/font/google';

import { themeAttribute, themeColors, themeStylesheet } from '@miluca/ui';

import { ErrorTextProvider } from '@/components/error-text';
import { siteUrl } from '@/lib/site-url';
import { getBaseMessages, getLanguage } from '@/server/i18n';
import { getThemePreference } from '@/server/theme';

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

export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    // Pantalla completa en iPhone: el contenido respeta las áreas seguras con env(safe-area-inset-*).
    viewportFit: 'cover',
    // La barra del navegador con el fondo del tema elegido, o el del equipo si sigue al equipo.
    themeColor: themeColors(await getThemePreference()),
  };
}

// Tokens de packages/ui como variables CSS: una sola fuente para colores y contrastes. El tema
// elegido (ADR 0033) va en `data-theme` de <html>, ya en el HTML del servidor: no hay destello.
const themeCss = themeStylesheet();

// Tipografía de la marca (docs/diseno/tokens.md, sección 4). next/font la descarga al construir y
// la sirve desde el mismo dominio: el navegador no le pide nada a Google. Solo los pesos en uso.
const livvic = Livvic({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-livvic',
});

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [language, theme, t] = await Promise.all([
    getLanguage(),
    getThemePreference(),
    getBaseMessages(),
  ]);
  return (
    <html
      lang={language}
      data-theme={themeAttribute(theme)}
      className={`${livvic.variable} h-full antialiased`}
    >
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorTextProvider text={t.common.error}>{children}</ErrorTextProvider>
      </body>
    </html>
  );
}
