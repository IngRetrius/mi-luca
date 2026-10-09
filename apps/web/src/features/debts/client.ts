// API pública del módulo para componentes de cliente y pruebas: solo los textos puros del plan de
// pago (sin consultas ni nada `server-only`). Lo de servidor se importa desde `index.ts`.
export { expensivePayoffText, formatMonth, payoffText } from './payoff-text';
