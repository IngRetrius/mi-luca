import { notFound } from 'next/navigation';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { getClientDetail } from '@/features/clients';
import { getMessages } from '@/server/i18n';

import { saveContinuityNotes } from './actions';
import { toAnswer } from './notes';
import { ContinuityNotesForm } from './notes-form';
import { followUpPaths } from './paths';
import { loadContinuityNotes } from './queries';

/** P-A16: lo que la ficha de continuidad no saca del plan (sucesión y decisiones tomadas). */
export async function ContinuityNotesScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.followUp.notesForm;
  const paths = followUpPaths(clientId);
  const [client, notes] = await Promise.all([
    getClientDetail(clientId),
    loadContinuityNotes(clientId),
  ]);
  if (client === 'not-found') notFound();
  const header = (
    <>
      <BackLink href={paths.page} label={t.followUp.title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!client || !notes) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.notes}
        />
      </Screen>
    );
  }
  return (
    <Screen>
      {header}
      <ContinuityNotesForm
        text={text}
        initial={{
          hasWill: toAnswer(notes.hasWill),
          beneficiariesReviewed: toAnswer(notes.beneficiariesReviewed),
          decisions: notes.decisions,
        }}
        action={saveContinuityNotes.bind(null, clientId)}
        cancelHref={paths.page}
      />
    </Screen>
  );
}
