/** Un bloque del texto: párrafo (con sus saltos de línea) o lista de viñetas. */
export type TextBlock =
  | { readonly kind: 'paragraph'; readonly lines: readonly string[] }
  | { readonly kind: 'list'; readonly items: readonly string[] };

const BULLET = /^\s*[-•*]\s+/;

/**
 * Parte un texto en bloques: una línea vacía separa párrafos y las líneas que empiezan con "- "
 * forman una lista. Es todo el formato que admiten la carta y las notas; lo demás es texto, sin
 * HTML, para que la pantalla y el PDF lo muestren igual y sin riesgo.
 */
export function textBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let lines: string[] = [];
  let items: string[] = [];
  const flush = () => {
    if (lines.length > 0) blocks.push({ kind: 'paragraph', lines });
    if (items.length > 0) blocks.push({ kind: 'list', items });
    lines = [];
    items = [];
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (BULLET.test(line)) {
      if (lines.length > 0) flush();
      items.push(line.replace(BULLET, ''));
    } else {
      if (items.length > 0) flush();
      lines.push(line);
    }
  }
  flush();
  return blocks;
}
