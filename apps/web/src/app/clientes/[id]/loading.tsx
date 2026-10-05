import { Screen } from '@/components/screen';
import { getMessages } from '@/server/i18n';

// Esqueleto de la ficha y de sus pantallas (presupuesto, flujo, bolsillos…). Sin título propio:
// el de /clientes ("Clientes") anunciaba otra pantalla mientras cargaba esta.
const rows = [0, 1, 2, 3];

export default async function ClientCaseLoading() {
  const t = await getMessages();
  return (
    <Screen>
      <div aria-busy="true" className="flex flex-col gap-6">
        <span role="status" className="sr-only">
          {t.common.loading}
        </span>
        <div className="flex flex-col gap-3">
          <div className="h-5 w-32 rounded-lg bg-surface motion-safe:animate-pulse" />
          <div className="h-8 w-2/3 rounded-lg bg-surface motion-safe:animate-pulse" />
          <div className="h-5 w-full rounded-lg bg-surface motion-safe:animate-pulse" />
        </div>
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
          {rows.map((row) => (
            <div key={row} className="h-16 bg-surface motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
    </Screen>
  );
}
