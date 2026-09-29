import { messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';

const t = messages.es;

// Tres filas con la forma de la lista mientras llegan los datos (sin parpadeo si se reduce el movimiento).
const rows = [0, 1, 2];

export default function ClientsLoading() {
  return (
    <Screen>
      <h1 className="text-2xl font-semibold">{t.clients.title}</h1>
      <div
        aria-busy="true"
        className="flex flex-col gap-px overflow-hidden rounded-xl border border-border"
      >
        <span role="status" className="sr-only">
          {t.common.loading}
        </span>
        {rows.map((row) => (
          <div key={row} className="h-16 bg-surface motion-safe:animate-pulse" />
        ))}
      </div>
    </Screen>
  );
}
