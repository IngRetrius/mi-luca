/** Rutas de bolsillos y bancos del asesor, dentro de la ficha del cliente. */
export function pocketPaths(clientId: string) {
  const list = `/clientes/${clientId}/bolsillos`;
  const banks = `${list}/bancos`;
  return {
    list,
    add: `${list}/nuevo`,
    item: (pocketId: string) => `${list}/${pocketId}`,
    banks,
    addBank: `${banks}/nuevo`,
    bank: (bankId: string) => `${banks}/${bankId}`,
  };
}
