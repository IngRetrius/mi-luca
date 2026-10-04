import { messages } from '@miluca/i18n';

import { AgentChat } from '@/features/assistant/client';
import { isUuid } from '@/server/case-access';
import { getViewer } from '@/server/viewer';

/**
 * El agente de captura llama a Claude y guarda en varios pasos: un mensaje puede tardar más que el
 * tiempo por defecto de una acción de servidor.
 */
export const maxDuration = 120;

/**
 * Pantallas de un cliente. El asistente vive aquí, en el layout, para que la conversación siga
 * mientras el asesor pasa de una pantalla del caso a otra. Solo lo ve el asesor (ADR 0017).
 */
export default async function ClientCaseLayout({
  children,
  params,
}: LayoutProps<'/clientes/[id]'>) {
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  return (
    <>
      {children}
      {viewer?.role === 'advisor' && isUuid(id) ? (
        <AgentChat clientId={id} text={messages.es.assistant.agent} />
      ) : null}
    </>
  );
}
