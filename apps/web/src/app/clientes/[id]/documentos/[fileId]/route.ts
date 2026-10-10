import { signedFileUrl } from '@/features/client-files';
import { requireCaseEditor } from '@/server/case-access';

/** Abre un documento del cliente para su asesor con un enlace de 60 segundos (ADR 0030). */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/clientes/[id]/documentos/[fileId]'>,
): Promise<Response> {
  const { id, fileId } = await params;
  await requireCaseEditor(id, `/clientes/${id}/documentos`);
  const url = await signedFileUrl(id, fileId);
  if (!url) return new Response('Not found', { status: 404 });
  return Response.redirect(url, 302);
}
