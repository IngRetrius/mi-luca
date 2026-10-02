'use client';

import { useEffect } from 'react';

/**
 * Con cambios sin guardar, el navegador pregunta antes de cerrar o recargar la pestaña. Mientras
 * se guarda no pregunta. "Cancelar" es una salida explícita y no pasa por aquí.
 */
export function useUnsavedWarning(dirty: boolean, pending: boolean): void {
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);
}
