import { PublicPrivacyPage } from '@/features/landing';
import { pageMetadata } from '@/server/i18n';

export const generateMetadata = pageMetadata('publicPrivacy');

/** P-G07 Privacidad pública: los avisos vigentes, con o sin sesión (ADR 0026). */
export default function PrivacyNoticePage() {
  return <PublicPrivacyPage />;
}
