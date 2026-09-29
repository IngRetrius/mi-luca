import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { messages } from '@miluca/i18n';

import { SignOutButton } from '@/features/auth';
import { homePath, requireViewer } from '@/server/viewer';

const t = messages.es.noProfile;

export const metadata: Metadata = { title: 'Sin invitación | MiLuca' };

/** P-G02: la cuenta existe, pero ningún perfil está vinculado a ella. */
export default async function NoProfilePage() {
  const viewer = await requireViewer('/sin-invitacion');
  if (viewer.role !== 'none') redirect(homePath(viewer));
  const { email } = viewer.user;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>
      {/* Un correo largo no tiene espacios: se parte en cualquier punto para no desbordar a 320 px. */}
      <p className="wrap-anywhere">{email ? t.signedInAs.replace('{email}', email) : t.signedIn}</p>
      <p className="text-text-muted">{t.howTo}</p>
      <p className="text-text-muted">{t.otherAccount}</p>
      <p className="text-text-muted">{t.deletion}</p>
      <div className="mt-2">
        <SignOutButton />
      </div>
    </main>
  );
}
