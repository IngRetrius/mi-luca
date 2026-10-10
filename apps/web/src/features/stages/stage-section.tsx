import Link from 'next/link';

import type { CaseStage } from '@miluca/domain';
import { formatDate } from '@miluca/i18n';

import { ModuleLink } from '@/components/back-link';
import {
  gridList,
  gridListItem,
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
} from '@/components/ui-classes';
import { getMessages } from '@/server/i18n';

import { setStageActive } from './actions';
import { StageToggle } from './stage-toggle';
import { doneIcon, StepList, type StepItem } from './step-list';
import { NAV_FORWARD } from '@/components/page-transition';

export interface StageModule {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
}

/**
 * Una etapa en la ficha del asesor (P-A03, ADR 0025). Activa: sus pasos con el siguiente como acción
 * principal (o, terminada, la fecha del reporte entregado), los opcionales con el botón de omitir
 * (ADR 0029), sus pantallas y la opción de ocultarla. Sin activar:
 * para qué sirve y el botón para activarla, con el aviso de que lo registrado sigue contando.
 */
export async function StageSection({
  clientId,
  stage,
  number,
  active,
  steps,
  delivered,
  hasData,
  note,
  modules,
  locale,
}: {
  clientId: string;
  stage: CaseStage;
  number: number;
  active: boolean;
  steps: readonly StepItem[];
  /** La última entrega que cubre la etapa (la suya o un plan completo). */
  delivered: { readonly id: string; readonly deliveredOn: string } | null;
  hasData: boolean;
  /** Un aviso de criterio para la etapa, por ejemplo deuda cara antes de invertir. */
  note: string | null;
  modules: readonly StageModule[];
  locale: string;
}) {
  const t = await getMessages();
  const text = t.stages;
  const titleId = `stage-${stage}-title`;
  const next = steps.find((step) => !step.done) ?? null;
  const done = steps.filter((step) => step.done).length;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="font-semibold text-balance">
          {text.numbered.replace('{number}', String(number)).replace('{name}', text.names[stage])}
        </h2>
        <p className="text-sm text-text-muted">{text.questions[stage]}</p>
      </div>

      {active ? (
        <>
          {/*
            Con todos los pasos hechos u omitidos, la etapa queda terminada (ADR 0029). Vivo: al
            omitir un paso, el lector de pantalla anuncia el nuevo conteo.
          */}
          <p aria-live="polite" className="flex items-center gap-2 text-sm font-medium">
            {next ? (
              text.progress.replace('{done}', String(done)).replace('{total}', String(steps.length))
            ) : (
              <>
                {doneIcon}
                {text.stageComplete}
              </>
            )}
          </p>
          <StepList clientId={clientId} steps={steps} />
          {next ? (
            <Link
              href={next.href}
              transitionTypes={NAV_FORWARD}
              className={`${primaryButton} ${linkButton} md:self-start`}
            >
              {next.label}
            </Link>
          ) : delivered ? (
            <p className="flex flex-wrap items-center gap-x-1 text-sm">
              {text.deliveredOn.replace('{date}', formatDate(delivered.deliveredOn, locale, 'UTC'))}
              <Link
                href={`/clientes/${clientId}/planes/${delivered.id}`}
                className={`${textButton} ${linkButton}`}
              >
                {text.viewReport}
              </Link>
            </p>
          ) : null}
          {note ? (
            <p className="rounded-xl border border-status-warning p-3 text-sm">{note}</p>
          ) : null}
          <h3 className="sr-only">{text.modulesTitle}</h3>
          <ul className={`${gridList} md:grid-cols-2`}>
            {modules.map((module) => (
              <li key={module.href} className={gridListItem}>
                <ModuleLink {...module} />
              </li>
            ))}
          </ul>
          <StageToggle
            action={setStageActive.bind(null, clientId, stage, false)}
            label={text.deactivate}
            pendingLabel={text.deactivating}
            errorText={text.toggleError}
            hint={text.deactivateHint}
            buttonClassName={`${textButton} -ml-3`}
          />
        </>
      ) : (
        <>
          <p className="text-sm">{hasData ? text.inactiveWithData : text.inactive}</p>
          <StageToggle
            action={setStageActive.bind(null, clientId, stage, true)}
            label={text.activate}
            pendingLabel={text.activating}
            errorText={text.toggleError}
            buttonClassName={secondaryButton}
          />
        </>
      )}
    </section>
  );
}
