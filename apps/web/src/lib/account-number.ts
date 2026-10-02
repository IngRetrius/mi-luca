/**
 * Ocho cifras seguidas o más (con espacios o guiones entre ellas) parecen un número de cuenta o de
 * tarjeta. No se guardan (CLAUDE.md, regla 9): el banco se identifica solo por su nombre.
 */
const ACCOUNT_LIKE = /\d(?:[\s-]?\d){7,}/;

export function looksLikeAccountNumber(value: string): boolean {
  return ACCOUNT_LIKE.test(value);
}
