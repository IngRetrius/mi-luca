import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';

import { textBlocks } from '../documents/blocks';

/** Una sección de la carta o de las notas, con el texto ya resuelto (cifras puestas). */
export interface PdfSection {
  readonly title: string | null;
  readonly text: string;
}

/**
 * Una tabla del plan (cómo va, bolsillos, deudas, metas): columnas opcionales, filas con sus celdas
 * (la primera es el nombre) y, debajo de cada fila, un detalle opcional; total y nota opcionales.
 */
export interface PdfTable {
  readonly title: string;
  readonly columns?: readonly string[];
  readonly rows: readonly { readonly cells: readonly string[]; readonly detail?: string }[];
  readonly footer?: readonly string[];
  readonly note?: string;
}

/** Colores de los tokens del modo claro (`packages/ui`): el PDF se imprime en papel blanco. */
export interface PdfColors {
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly surface: string;
}

/**
 * Todo lo que lleva el PDF del plan entregado, ya escrito en el idioma, el trato y el formato del
 * cliente. El exportador no consulta la base ni calcula cifras: las recibe del plan entregado.
 */
export interface LetterPdfInput {
  /** "Carta de tu asesor". */
  readonly title: string;
  readonly clientName: string;
  readonly planLabel: string;
  /** "Entregado el … · cifras con corte al …". */
  readonly meta: string;
  /** "Preparado por …": el asesor que entregó el plan; null si no se conoce. */
  readonly advisor?: string | null;
  /** El resumen de la carta, arriba, antes de las tablas; null sin resumen. */
  readonly summary?: PdfSection | null;
  /** Lo que el cliente usa: cómo va, bolsillos, deudas y metas, ya escrito (ADR 0028). */
  readonly tables?: readonly PdfTable[];
  /** El resto de la carta, después de las tablas. */
  readonly letter: readonly PdfSection[];
  /** "Carta de tu asesor": título del resto de la carta cuando va después de las tablas. */
  readonly letterTitle?: string;
  readonly notesTitle: string;
  readonly notes: readonly PdfSection[];
  readonly figuresTitle: string;
  readonly figures: readonly { readonly label: string; readonly value: string }[];
  /** Al pie de cada página: "Cifras en COP de hoy. Ilustrativas, no garantizadas.". */
  readonly footer: string;
  /** "Página {page} de {total}". */
  readonly pageLabel: string;
  /** Alcance de la plataforma (regla 11), al final. */
  readonly scope: string;
  /** Idioma de los textos (BCP 47), para los lectores de pantalla del PDF. Por defecto, español. */
  readonly language?: string;
  readonly colors: PdfColors;
}

/** Alto de una página A4 en puntos. */
const A4_HEIGHT = 841.89;

// Sin guiones de corte: la separación en sílabas que trae la librería es la del inglés.
Font.registerHyphenationCallback((word) => [word]);

/**
 * Helvetica (las fuentes estándar del PDF) cubre el español, el € y las comillas, pero no los
 * espacios finos que usa `Intl` en algunos formatos ni el signo menos tipográfico: se cambian por
 * su equivalente para que no salgan como un símbolo raro.
 */
export function pdfSafe(text: string): string {
  return text.replace(/[\u2007\u2009\u202F]/g, '\u00A0').replace(/\u2212/g, '-');
}

function styles(colors: PdfColors) {
  return StyleSheet.create({
    page: {
      paddingTop: 48,
      paddingBottom: 56,
      paddingHorizontal: 56,
      fontFamily: 'Helvetica',
      fontSize: 10.5,
      lineHeight: 1.45,
      color: colors.text,
    },
    eyebrow: { fontSize: 9, color: colors.textMuted, marginBottom: 4 },
    title: { fontFamily: 'Helvetica-Bold', fontSize: 18, lineHeight: 1.2, marginBottom: 6 },
    meta: { fontSize: 9, color: colors.textMuted, marginBottom: 20 },
    sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 14, marginBottom: 6 },
    letterTitle: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginTop: 22, marginBottom: 6 },
    paragraph: { marginBottom: 6 },
    listItem: { flexDirection: 'row', marginBottom: 3 },
    bullet: { width: 12 },
    listText: { flex: 1 },
    figures: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      backgroundColor: colors.surface,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    figureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    figureValue: { fontFamily: 'Helvetica-Bold' },
    table: { marginTop: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 4 },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    tableHead: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
      fontFamily: 'Helvetica-Bold',
    },
    tableFirst: { flex: 1, paddingRight: 8 },
    tableCell: { width: 120, textAlign: 'right' },
    tableDetail: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
    tableNote: { fontSize: 9, color: colors.textMuted, marginTop: 4 },
    bold: { fontFamily: 'Helvetica-Bold' },
    scope: { marginTop: 18, fontSize: 9, color: colors.textMuted },
    footer: {
      position: 'absolute',
      // Con `bottom` la librería lo dibuja fuera de la página; se mide desde arriba en A4.
      top: A4_HEIGHT - 36,
      left: 56,
      right: 56,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 8,
      color: colors.textMuted,
    },
  });
}

type Styles = ReturnType<typeof styles>;

function Body({ text, s }: { text: string; s: Styles }) {
  return (
    <>
      {textBlocks(pdfSafe(text)).map((block, index) =>
        block.kind === 'paragraph' ? (
          <Text key={index} style={s.paragraph}>
            {block.lines.join('\n')}
          </Text>
        ) : (
          <View key={index} style={s.paragraph}>
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} style={s.listItem} wrap={false}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listText}>{item}</Text>
              </View>
            ))}
          </View>
        ),
      )}
    </>
  );
}

function Sections({ sections, s }: { sections: readonly PdfSection[]; s: Styles }) {
  return (
    <>
      {sections.map((section, index) => (
        <View key={index}>
          {section.title ? (
            // El título no queda solo al pie de una página.
            <Text style={s.sectionTitle} minPresenceAhead={40}>
              {pdfSafe(section.title)}
            </Text>
          ) : null}
          <Body text={section.text} s={s} />
        </View>
      ))}
    </>
  );
}

function Table({ table, s }: { table: PdfTable; s: Styles }) {
  // Con dos columnas, la de la derecha lleva frases ("Sale en febrero de 2028 · 16 meses"): más ancha.
  const columns = table.columns?.length ?? table.rows[0]?.cells.length ?? 2;
  const cellStyle = [s.tableCell, { width: columns > 2 ? 110 : 200 }];
  const cells = (values: readonly string[], bold = false) =>
    values.map((value, index) => (
      <Text
        key={index}
        style={[...(index === 0 ? [s.tableFirst] : cellStyle), ...(bold ? [s.bold] : [])]}
      >
        {pdfSafe(value)}
      </Text>
    ));
  return (
    <View>
      <Text style={s.sectionTitle} minPresenceAhead={60}>
        {pdfSafe(table.title)}
      </Text>
      <View style={s.table}>
        {table.columns ? <View style={s.tableHead}>{cells(table.columns)}</View> : null}
        {table.rows.map((row, index) => (
          <View
            key={index}
            style={index === 0 && !table.columns ? [s.tableRow, { borderTopWidth: 0 }] : s.tableRow}
            wrap={false}
          >
            <View style={s.tableFirst}>
              <Text style={s.bold}>{pdfSafe(row.cells[0] ?? '')}</Text>
              {row.detail ? <Text style={s.tableDetail}>{pdfSafe(row.detail)}</Text> : null}
            </View>
            {row.cells.slice(1).map((value, cell) => (
              <Text key={cell} style={cellStyle}>
                {pdfSafe(value)}
              </Text>
            ))}
          </View>
        ))}
        {table.footer ? <View style={s.tableRow}>{cells(table.footer, true)}</View> : null}
      </View>
      {table.note ? <Text style={s.tableNote}>{pdfSafe(table.note)}</Text> : null}
    </View>
  );
}

/**
 * El plan entregado en PDF (ADR 0020 y 0028): el resumen de la carta; lo que el cliente usa (cómo
 * va, bolsillos, deudas, metas); el resto de la carta y las notas; las cifras y el alcance.
 */
export function LetterDocument({ input }: { input: LetterPdfInput }) {
  const s = styles(input.colors);
  return (
    <Document
      title={pdfSafe(`${input.title} · ${input.planLabel}`)}
      author="MiLuca"
      creator="MiLuca"
      producer="MiLuca"
      language={input.language ?? 'es'}
    >
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>{pdfSafe(input.planLabel)}</Text>
        <Text style={s.title}>{pdfSafe(input.title)}</Text>
        <Text style={s.meta}>
          {pdfSafe([input.clientName, input.meta, input.advisor].filter(Boolean).join(' · '))}
        </Text>

        {input.summary ? <Sections sections={[input.summary]} s={s} /> : null}

        {(input.tables ?? []).map((table) => (
          <Table key={table.title} table={table} s={s} />
        ))}

        {input.letterTitle && input.letter.length > 0 ? (
          <Text style={s.letterTitle} minPresenceAhead={60}>
            {pdfSafe(input.letterTitle)}
          </Text>
        ) : null}
        <Sections sections={input.letter} s={s} />

        {input.notes.length > 0 ? (
          <>
            <Text style={s.sectionTitle} minPresenceAhead={40}>
              {pdfSafe(input.notesTitle)}
            </Text>
            <Sections sections={input.notes} s={s} />
          </>
        ) : null}

        {input.figures.length > 0 ? (
          <View wrap={false}>
            <Text style={s.sectionTitle}>{pdfSafe(input.figuresTitle)}</Text>
            <View style={s.figures}>
              {input.figures.map((figure) => (
                <View key={figure.label} style={s.figureRow}>
                  <Text>{pdfSafe(figure.label)}</Text>
                  <Text style={s.figureValue}>{pdfSafe(figure.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={s.scope}>{pdfSafe(input.scope)}</Text>

        <View style={s.footer} fixed>
          <Text>{pdfSafe(input.footer)}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              input.pageLabel
                .replace('{page}', String(pageNumber))
                .replace('{total}', String(totalPages))
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** El PDF listo para descargar. */
export async function renderLetterPdf(input: LetterPdfInput): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<LetterDocument input={input} />));
}
