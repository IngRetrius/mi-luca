// API pública del módulo para componentes de cliente y pruebas: solo funciones puras (sin consultas
// ni nada `server-only`). Lo de servidor se importa desde `index.ts`.
export { fundPlanState, fundPlanText, type FundPlanState } from './fund-plan';
