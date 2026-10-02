import { expect } from 'vitest';

import { cell, type GoldenCase } from './cases';

// Tolerancia de importes y conteos (04-motor, 7.1).
const TOLERANCE = 0.01;

/** El motor devuelve null donde Excel deja la celda vacía (""); lo demás son números. */
export function expectCell(golden: GoldenCase, ref: string, actual: number | null): void {
  const expected = cell(golden, ref);
  if (expected === '' || expected === undefined || expected === null) {
    expect(actual, ref).toBeNull();
    return;
  }
  if (typeof expected !== 'number') throw new Error(`${ref} no es numérica: ${String(expected)}`);
  expect(actual, ref).not.toBeNull();
  expect(
    Math.abs((actual ?? 0) - expected),
    `${ref}: motor ${actual}, Excel ${expected}`,
  ).toBeLessThanOrEqual(TOLERANCE);
}
