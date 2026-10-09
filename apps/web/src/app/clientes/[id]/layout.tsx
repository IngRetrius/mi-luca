import { AgentChat } from '@/features/assistant/client';
import { isUuid } from '@/server/case-access';
import { getBaseMessages } from '@/server/i18n';
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
  const t = await getBaseMessages();
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  if (viewer?.role !== 'advisor' || !isUuid(id)) return children;
  // Espacio al final para que el último contenido pueda subir por encima del botón flotante del
  // asistente y no quede tapado (ADR 0028).
  return (
    <>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <AgentChat clientId={id} text={t.assistant.agent} />
    </>
  );
}
