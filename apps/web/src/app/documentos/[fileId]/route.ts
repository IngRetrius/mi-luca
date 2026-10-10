import { signedFileUrl } from '@/features/client-files';
import { requireClient } from '@/server/viewer';

/** Abre un documento del cliente con un enlace de 60 segundos (ADR 0030). */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/documentos/[fileId]'>,
): Promise<Response> {
  const { fileId } = await params;
  const viewer = await requireClient(`/documentos`);
  const url = await signedFileUrl(viewer.clientId, fileId);
  if (!url) return new Response('Not found', { status: 404 });
  return Response.redirect(url, 302);
}
