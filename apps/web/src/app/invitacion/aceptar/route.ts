import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { acceptFromFlow } from '@/features/invitations';

/**
 * Aceptación al llegar por navegación: desde /auth/callback (Google), desde Entrar cuando el correo
 * ya tenía cuenta, o desde P-C12 al volver con sesión. Las acciones de servidor aceptan por su
 * cuenta, porque una acción no debe redirigir a un Route Handler.
 */
export async function GET(request: NextRequest) {
  redirect(await acceptFromFlow(request.headers.get('user-agent')));
}
