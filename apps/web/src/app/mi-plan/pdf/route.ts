import type { NextRequest } from 'next/server';

import { deliveryPdfResponse } from '@/features/deliveries';
import { requireClient } from '@/server/viewer';

/** P-C05: el plan entregado en PDF; `?version=` elige una entrega anterior. */
export async function GET(request: NextRequest) {
  const viewer = await requireClient('/mi-plan');
  return deliveryPdfResponse(viewer.clientId, request.nextUrl.searchParams.get('version'));
}
