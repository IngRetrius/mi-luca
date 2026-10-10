/** El tamaño de un archivo en KB o MB, con el formato del país (`Intl`). */
export function formatFileSize(bytes: number, locale: string): string {
  const megabytes = bytes / (1024 * 1024);
  const [unit, value] = megabytes >= 1 ? ['megabyte', megabytes] : ['kilobyte', bytes / 1024];
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    maximumFractionDigits: unit === 'megabyte' ? 1 : 0,
  }).format(Math.max(value, unit === 'kilobyte' ? 1 : value));
}
