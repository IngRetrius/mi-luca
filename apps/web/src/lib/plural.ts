/**
 * Un texto con forma en singular y en plural (`{ one, other }`), con `{count}` puesto. En español y
 * en inglés basta con distinguir 1 del resto para contar cosas enteras (G14).
 */
export function plural(text: { readonly one: string; readonly other: string }, count: number) {
  return (count === 1 ? text.one : text.other).replace('{count}', String(count));
}
