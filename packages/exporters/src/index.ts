// Exportaciones previstas (fase 7): Excel compatible con la plantilla, carta en PDF y ficha de continuidad.
// Ver docs/04-motor-de-calculo.md y packages/exporters/README.md.

export const EXPORT_FORMATS = ['xlsx', 'pdf', 'txt'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export * from './documents';
