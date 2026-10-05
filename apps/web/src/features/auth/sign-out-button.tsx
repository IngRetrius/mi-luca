import { secondaryButton } from '@/components/ui-classes';
import { getMessages } from '@/server/i18n';

import { signOut } from './actions';

export async function SignOutButton() {
  const t = await getMessages();
  return (
    <form action={signOut}>
      <button type="submit" className={secondaryButton}>
        {t.auth.signOut}
      </button>
    </form>
  );
}
