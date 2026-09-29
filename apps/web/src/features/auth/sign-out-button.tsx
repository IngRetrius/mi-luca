import { messages } from '@miluca/i18n';

import { signOut } from './actions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-12 rounded-xl border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {messages.es.auth.signOut}
      </button>
    </form>
  );
}
