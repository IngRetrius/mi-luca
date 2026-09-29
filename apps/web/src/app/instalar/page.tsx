import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

import { messages } from '@miluca/i18n';

import { Screen, ScreenActions } from '@/components/screen';
import { linkButton, primaryButton, secondaryButton } from '@/components/ui-classes';
import { InstallGuide } from '@/features/install';
import { withAddress } from '@/lib/address';
import { detectPlatform } from '@/lib/pwa';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Agregar a inicio | MiLuca' };

/** P-C03 Agregar a inicio: llega aquí el cliente justo después de aceptar la invitación. */
export default async function InstallPage() {
  // Independientes: la sesión y la cabecera del navegador se resuelven a la vez.
  const [viewer, requestHeaders] = await Promise.all([requireClient('/instalar'), headers()]);
  const t = withAddress(messages.es.install, viewer.formOfAddress);
  const platform = detectPlatform(requestHeaders.get('user-agent'));

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>
        <p className="text-text-muted">{t.intro}</p>
      </header>
      <InstallGuide platform={platform} text={t} />
      <ScreenActions>
        <Link href="/" className={`${primaryButton} ${linkButton}`}>
          {t.done}
        </Link>
        <Link href="/" className={`${secondaryButton} ${linkButton}`}>
          {t.notNow}
        </Link>
      </ScreenActions>
    </Screen>
  );
}
