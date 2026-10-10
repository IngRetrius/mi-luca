import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ENTER_CLASSES, EXIT_CLASSES } from './page-transition';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/** Clases que globals.css anima en la capa vieja (`old`) o en la nueva (`new`). */
function animatedClasses(side: 'old' | 'new'): Set<string> {
  const pattern = new RegExp(String.raw`::view-transition-${side}\(\.([\w-]+)\)`, 'g');
  return new Set(Array.from(css.matchAll(pattern), (match) => match[1] ?? ''));
}

describe('PageTransition', () => {
  // En Safari, una capa que ya se animó en una transición anterior no vuelve a animarse: si la
  // entrada animara también la capa vieja, la salida de esa pantalla se cortaría de golpe.
  it('la entrada anima solo la capa nueva y la salida solo la vieja', () => {
    const exit = new Set(Object.values(EXIT_CLASSES));
    expect(Object.values(ENTER_CLASSES).filter((name) => exit.has(name))).toEqual([]);
    expect(animatedClasses('new')).toEqual(new Set(Object.values(ENTER_CLASSES)));
    expect(animatedClasses('old')).toEqual(new Set(Object.values(EXIT_CLASSES)));
  });
});
