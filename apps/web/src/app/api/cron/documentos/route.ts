import { purgeClientFiles } from '@/features/client-files';
import { isCronAuthorized } from '@/lib/cron';

/** Borrado diario de los documentos del cliente (ADR 0030), lo llama el cron de Vercel. */
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const result = await purgeClientFiles(new Date());
  if (!result) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, ...result });
}
