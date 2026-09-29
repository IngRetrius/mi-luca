'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { secondaryButton } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';
import { isStandalone, type Platform } from '@/lib/pwa';

type InstallText = Addressed<Messages['install']>;

/** Evento de Chrome que permite mostrar el diálogo de instalación desde un botón propio. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Icono de Compartir de Safari: se muestra junto al texto, que es el que lo nombra. */
const shareIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="inline size-5 align-text-bottom"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M10 2.5v10M6.5 6 10 2.5 13.5 6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 8.5H5.5v9h9v-9H13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * P-C03: cómo agregar MiLuca a la pantalla de inicio según el sistema (05-pantallas, P-C03). En
 * Android usa el diálogo del navegador (`beforeinstallprompt`) si está disponible; en iPhone solo
 * se puede explicar, porque Safari no lo ofrece. Si ya corre instalada, no hay nada que mostrar.
 */
export function InstallGuide({ platform, text }: { platform: Platform; text: InstallText }) {
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) router.replace('/');
  }, [router]);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    // El evento sirve una sola vez.
    setInstallPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
  }

  if (platform === 'ios') {
    const [shareBefore, shareAfter = ''] = text.ios.step1.split(text.ios.shareIcon);
    return (
      <div className="flex flex-col gap-4">
        <ol className="flex list-decimal flex-col gap-3 pl-6 marker:font-semibold">
          <li>
            {/* El icono va pegado a la palabra que lo nombra, para que no quede solo en otra línea. */}
            {shareBefore}
            <span className="whitespace-nowrap">
              {text.ios.shareIcon} {shareIcon}
            </span>
            {shareAfter}
          </li>
          <li>{text.ios.step2}</li>
          <li>{text.ios.step3}</li>
        </ol>
        <p className="rounded-xl bg-surface p-4">{text.ios.afterwards}</p>
      </div>
    );
  }

  if (platform === 'android') {
    return (
      <div className="flex flex-col gap-4">
        {installPrompt ? (
          // Secundario: la acción principal de la pantalla es la barra de abajo.
          <button type="button" onClick={install} className={`bg-surface ${secondaryButton}`}>
            {text.android.button}
          </button>
        ) : null}
        <p role="status">{installed ? text.android.installed : null}</p>
        {installPrompt || installed ? null : <p>{text.android.manual}</p>}
      </div>
    );
  }

  return <p>{text.other}</p>;
}
