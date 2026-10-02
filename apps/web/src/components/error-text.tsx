'use client';

import { createContext, use, type ReactNode } from 'react';

import type { Messages } from '@miluca/i18n';

export type ErrorText = Messages['common']['error'];

const ErrorTextContext = createContext<ErrorText | null>(null);

/**
 * Textos de la pantalla de error. Un `error.tsx` no recibe props del servidor, así que el layout
 * raíz se los pasa por contexto y no se envía todo el catálogo de textos al navegador.
 */
export function ErrorTextProvider({ text, children }: { text: ErrorText; children: ReactNode }) {
  return <ErrorTextContext value={text}>{children}</ErrorTextContext>;
}

export function useErrorText(): ErrorText {
  const text = use(ErrorTextContext);
  if (!text) throw new Error('Falta ErrorTextProvider en el layout raíz');
  return text;
}
