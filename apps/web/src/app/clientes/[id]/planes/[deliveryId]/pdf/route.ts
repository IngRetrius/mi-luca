import { deliveryPdfResponse } from '@/features/deliveries';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

/** El PDF de un plan entregado, el mismo que descarga el cliente. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/clientes/[id]/planes/[deliveryId]/pdf'>,
) {
  const { id, deliveryId } = await params;
  const path = `/clientes/${id}/planes/${deliveryId}`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  if (!isUuid(deliveryId)) return new Response(null, { status: 404 });
  return deliveryPdfResponse(id, deliveryId);
}
