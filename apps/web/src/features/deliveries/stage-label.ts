/**
 * ¿El nombre de la versión ya dice la etapa? El nombre por defecto la trae ("Deudas, 8 de octubre de
 * 2026"); entonces las listas no la repiten. Un nombre propio ("Revisión a 90 días") sí la necesita.
 */
export function labelNamesStage(label: string, stageName: string): boolean {
  return label.toLocaleLowerCase().includes(stageName.toLocaleLowerCase());
}
