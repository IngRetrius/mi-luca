import { messages } from '@miluca/i18n';

import { secondaryButton } from '@/components/ui-classes';

import { signOut } from './actions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={secondaryButton}>
        {messages.es.auth.signOut}
      </button>
    </form>
  );
}
