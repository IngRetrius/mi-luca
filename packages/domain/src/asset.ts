import { z } from 'zod';

/**
 * Tipo de activo (`assets.asset_type`). Las inversiones y las cuentas por cobrar tienen sus
 * propias tablas; en la plantilla son las filas 6 y 7 de Patrimonio.
 */
export const assetTypeSchema = z.enum(['liquido', 'inmueble', 'vehiculo', 'otro']);
export type AssetType = z.infer<typeof assetTypeSchema>;
