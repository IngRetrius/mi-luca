// API pública del módulo para componentes de cliente: solo lo que puede ir al navegador (sin
// consultas ni nada `server-only`). Lo de servidor se importa desde `index.ts`.
export { toBudgetItemInput, toCaseInput, toIncomeInput, toMethodology } from './case-input';
export type { CaseForEngine, CaseRows } from './case-input';
export { ImpactPreview } from './impact-preview';
export type { ImpactPreviewText } from './impact-preview';
export { previewFigureIds, usePreviewFigures } from './preview';
export type { PreviewCase } from './preview';
export { formatKeyFigure } from './format-key-figure';
export type { MonthsText } from './format-key-figure';
