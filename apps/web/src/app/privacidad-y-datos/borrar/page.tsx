import { BackLink } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { DeleteAccountForm, deleteMyAccount } from '@/features/consent';
import { withAddress } from '@/lib/address';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('deleteAccount');

/**
 * P-C14 Borrar mi cuenta (plan 15): qué se borra, que no se puede deshacer y la confirmación. Se
 * borra de inmediato, con la cuenta de acceso; su asesor recibe un aviso sin su nombre.
 */
export default async function DeleteAccountPage() {
  const messages = await getMessages();
  const viewer = await requireClient('/privacidad-y-datos/borrar');
  const t = withAddress(messages.privacy.deleteAccount, viewer.formOfAddress);
  const items = [t.itemData, t.itemReports, t.itemFiles, t.itemHistory, t.itemAccount];

  return (
    <Screen>
      <BackLink href="/privacidad-y-datos" label={messages.pageTitle.privacy} />
      <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>
      <p>{t.intro}</p>
      <section aria-labelledby="delete-what-title" className="flex flex-col gap-2">
        <h2 id="delete-what-title" className="font-semibold">
          {t.whatTitle}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <DeleteAccountForm text={t} action={deleteMyAccount} cancelHref="/privacidad-y-datos" />
    </Screen>
  );
}
