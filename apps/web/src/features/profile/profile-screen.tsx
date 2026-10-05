import { formatMoney } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { getLocale, getMessages } from '@/server/i18n';

import { saveProfile } from './actions';
import { ProfileForm, type ThresholdChoice } from './profile-form';
import { loadProfile } from './queries';
import { CLIENT_TYPES, type ClientType, type ProfileValues } from './validation';

/** P-A04 bloque A y P-A05: perfil, tipo de cliente y supuestos del caso (solo el asesor). */
export async function ProfileScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.profile;
  const labels: Readonly<Record<string, string>> = text.thresholdLabels;
  const back = `/clientes/${clientId}`;
  const data = await loadProfile(clientId);
  const header = (
    <>
      <BackLink href={back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!data) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={`${back}/perfil`}
        />
      </Screen>
    );
  }

  const { client, settings } = data;
  const locale = await getLocale(client.country_code);
  const thresholds: ThresholdChoice[] = data.thresholds.map((threshold) => {
    const amount =
      threshold.unit && /^[A-Z]{3}$/.test(threshold.unit)
        ? formatMoney(threshold.value, threshold.unit, locale)
        : String(threshold.value);
    return {
      key: threshold.key,
      label: text.thresholdOption
        .replace('{label}', labels[threshold.key] ?? threshold.key)
        .replace('{amount}', amount),
    };
  });
  const clientType = (CLIENT_TYPES as readonly string[]).includes(client.client_type ?? '')
    ? (client.client_type as ClientType)
    : '';
  const initial: ProfileValues = {
    birthDate: client.birth_date ?? '',
    sex: client.sex === 'mujer' || client.sex === 'hombre' ? client.sex : '',
    dependents: String(client.dependents_count),
    clientType,
    cutoffDate: settings?.cutoff_date ?? '',
    flowYear: settings?.flow_year ? String(settings.flow_year) : '',
    mode: settings?.compatibility_mode ? 'compatible' : 'native',
    thresholds: settings?.fiscal_threshold_keys ?? [],
  };

  return (
    <Screen>
      {header}
      <ProfileForm
        text={text}
        initial={initial}
        countryName={data.countryName}
        thresholds={thresholds}
        emergencyMonths={data.emergencyMonths}
        action={saveProfile.bind(null, clientId)}
        cancelHref={back}
      />
    </Screen>
  );
}
