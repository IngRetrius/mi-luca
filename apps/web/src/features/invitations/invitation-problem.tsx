import Link from 'next/link';

import { linkButton, primaryButton, secondaryButton } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import { getMessages } from '@/server/i18n';

export const PROBLEM_REASONS = [
  'invalid',
  'expired',
  'revoked',
  'used',
  'missing',
  'advisor',
  'linked',
  'noLegalText',
  'unavailable',
] as const;
export type ProblemReason = (typeof PROBLEM_REASONS)[number];

export function parseProblemReason(value: unknown): ProblemReason {
  return PROBLEM_REASONS.find((reason) => reason === value) ?? 'invalid';
}

/**
 * Por qué no se puede seguir con la invitación, y qué hacer. `retryHref` es la ruta que se vuelve
 * a intentar cuando el servicio no respondió.
 */
export async function InvitationProblem({
  reason,
  retryHref,
}: {
  reason: ProblemReason;
  retryHref?: string | undefined;
}) {
  const messages = await getMessages();
  const t = messages.invitation;
  const { title, body } = t.problem[reason];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <p className="text-text-muted">{body}</p>
      <div className="mt-2 flex flex-col gap-3">
        {reason === 'used' ? (
          <Link href="/entrar" className={`${primaryButton} ${linkButton}`}>
            {t.signIn}
          </Link>
        ) : null}
        {reason === 'linked' ? (
          <Link href="/" className={`${primaryButton} ${linkButton}`}>
            {t.goHome}
          </Link>
        ) : null}
        {reason === 'advisor' || reason === 'linked' ? <SignOutButton /> : null}
        {reason === 'unavailable' && retryHref ? (
          <Link href={retryHref} className={`${secondaryButton} ${linkButton}`}>
            {messages.common.retry}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
