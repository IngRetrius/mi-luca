import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { linkButton, secondaryButton } from '@/components/ui-classes';
import { DeleteClientForm, deleteUnclaimedClient, getClientDetail } from '@/features/clients';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('deleteClient');

/**
 * P-A27 Borrar perfil (plan 15): solo un perfil que nadie aceptó, como uno creado por error. Uno con
 * dueño lo borra el dueño; el asesor lo desactiva desde la ficha.
 */
export default async function DeleteClientPage({ params }: PageProps<'/clientes/[id]/borrar'>) {
  const t = await getMessages();
  const { id } = await params;
  const path = `/clientes/${id}/borrar`;
  await requireAdvisor(path);
  const client = await getClientDetail(id);
  if (client === 'not-found') notFound();
  const text = t.clientProfile.delete;
  const back = `/clientes/${id}`;

  return (
    <Screen>
      <BackLink href={back} label={text.back} />
      <h1 className="text-2xl font-semibold">{text.title}</h1>
      {client === null ? (
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={path} />
      ) : client.claimed ? (
        <div className="flex flex-col items-start gap-4">
          <p>{text.owned}</p>
          <Link href={back} className={`${secondaryButton} ${linkButton}`}>
            {text.back}
          </Link>
        </div>
      ) : (
        <>
          <p>{text.intro}</p>
          <DeleteClientForm
            displayName={client.displayName}
            cancelHref={back}
            text={text}
            action={deleteUnclaimedClient.bind(null, client.id)}
          />
        </>
      )}
    </Screen>
  );
}
