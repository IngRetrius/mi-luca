import type { Accounts, LocalSupabase } from './local-supabase.ts';
import { Rest } from './local-supabase.ts';

/**
 * Caso inventado de las capturas del landing (regla 4 de CLAUDE.md: nada de clientes reales). Una
 * persona empleada con sueldo fijo y un ingreso extra, gastos del mes, tres bolsillos y dos deudas;
 * las etapas de presupuesto y de deudas activas. Las cuentas existen solo en Supabase local.
 */
export const ADVISOR = {
  email: 'asesoria.capturas@example.com',
  displayName: 'Asesoría de ejemplo',
} as const;

export const CLIENT = {
  email: 'cliente.capturas@example.com',
  displayName: 'Ana',
  countryCode: 'CO',
  currency: 'COP',
} as const;

/** Fecha de corte fija: las cifras salen iguales cada vez que se regeneran. */
const CUTOFF_DATE = '2026-10-01';

export const CASE_LANGUAGES = ['es', 'en'] as const;
export type CaseLanguage = (typeof CASE_LANGUAGES)[number];

/**
 * Lo que la persona escribe con sus palabras va en el idioma de la captura. Las categorías se
 * guardan con su valor canónico y la app las traduce sola.
 */
type Words = Readonly<Record<CaseLanguage, string>>;

const MONTHLY = 'mensual';

/** Ingresos netos del mes: el sueldo y unas clases que da por su cuenta. */
const INCOMES: readonly { name: Words; amount: number }[] = [
  { name: { es: 'Salario', en: 'Salary' }, amount: 5_200_000 },
  { name: { es: 'Clases particulares', en: 'Private lessons' }, amount: 450_000 },
];

/** Gastos del mes que se pagan directo, con su categoría canónica. */
const EXPENSES: readonly {
  category: string;
  concept: Words;
  amount: number;
  essential: boolean;
}[] = [
  {
    category: 'Vivienda',
    concept: { es: 'Arriendo', en: 'Rent' },
    amount: 1_350_000,
    essential: true,
  },
  {
    category: 'Vivienda',
    concept: { es: 'Servicios públicos', en: 'Utilities' },
    amount: 260_000,
    essential: true,
  },
  {
    category: 'Servicios',
    concept: { es: 'Internet y teléfono', en: 'Internet and phone' },
    amount: 130_000,
    essential: true,
  },
  {
    category: 'Alimentación',
    concept: { es: 'Mercado', en: 'Groceries' },
    amount: 800_000,
    essential: true,
  },
  {
    category: 'Transporte',
    concept: { es: 'Transporte', en: 'Transport' },
    amount: 240_000,
    essential: true,
  },
  {
    category: 'Viajes y ocio',
    concept: { es: 'Salidas y restaurantes', en: 'Eating out' },
    amount: 320_000,
    essential: false,
  },
  {
    category: 'Salud y bienestar',
    concept: { es: 'Gimnasio', en: 'Gym' },
    amount: 110_000,
    essential: false,
  },
];

/** Bolsillos generales con el gasto que reciben (valor por pago y frecuencia). */
const POCKETS: readonly {
  name: Words;
  category: string;
  concept: Words;
  amount: number;
  frequency: string;
}[] = [
  {
    name: { es: 'Ropa', en: 'Clothes' },
    category: 'Cuidado personal',
    concept: { es: 'Ropa', en: 'Clothes' },
    amount: 450_000,
    frequency: 'semestral',
  },
  {
    name: { es: 'Vacaciones', en: 'Vacation' },
    category: 'Viajes y ocio',
    concept: { es: 'Vacaciones', en: 'Vacation' },
    amount: 2_400_000,
    frequency: 'anual',
  },
  {
    name: { es: 'Regalos', en: 'Gifts' },
    category: 'Temporada',
    concept: { es: 'Regalos de fin de año', en: 'Year-end gifts' },
    amount: 600_000,
    frequency: 'anual',
  },
];

const EMERGENCY_POCKET: Words = { es: 'Fondo de emergencia', en: 'Emergency fund' };
const BANK: Words = { es: 'Banco principal', en: 'Main bank' };

/** Deudas: saldo, tasa efectiva anual y cuota mínima. Sin entidad: no se nombra ninguna. */
const DEBTS: readonly {
  name: Words;
  debt_type: string;
  balance: number;
  annual_rate: number;
  min_payment: number;
}[] = [
  {
    name: { es: 'Tarjeta de crédito', en: 'Credit card' },
    debt_type: 'tarjeta_credito',
    balance: 3_200_000,
    annual_rate: 0.29,
    min_payment: 190_000,
  },
  {
    name: { es: 'Crédito de libre inversión', en: 'Personal loan' },
    debt_type: 'libre_inversion',
    balance: 8_400_000,
    annual_rate: 0.18,
    min_payment: 410_000,
  },
];

/**
 * Borra el caso de una corrida anterior: el perfil (sus datos y entregas caen en cascada) y la
 * cuenta del cliente. La cuenta del asesor se reutiliza.
 */
async function removePrevious(admin: Rest, accounts: Accounts, advisorUserId: string) {
  await admin.delete('clients', `created_by=eq.${advisorUserId}`);
  await accounts.remove(CLIENT.email);
}

/** La cuenta del asesor y su fila en `advisors`, creadas una sola vez. */
async function ensureAdvisor(admin: Rest, accounts: Accounts, password: string): Promise<string> {
  const userId = await accounts.ensure(ADVISOR.email, password);
  const existing = await admin.select('advisors', `user_id=eq.${userId}&select=id`);
  if (existing.length === 0) {
    await admin.insert('advisors', { user_id: userId, display_name: ADVISOR.displayName });
  }
  return userId;
}

/**
 * Arma el caso como lo haría el asesor en la app (con su sesión y RLS) y vincula la cuenta del
 * cliente al perfil, como al aceptar la invitación. Devuelve el id del perfil.
 */
export async function prepareCase(
  env: LocalSupabase,
  accounts: Accounts,
  password: string,
  language: CaseLanguage,
): Promise<string> {
  const admin = new Rest(env, env.secretKey);
  const advisorUserId = await ensureAdvisor(admin, accounts, password);
  await removePrevious(admin, accounts, advisorUserId);

  const advisor = new Rest(env, await accounts.signIn(ADVISOR.email, password));
  const clientId = await advisor.rpc<string>('create_client', {
    p_display_name: CLIENT.displayName,
    p_country_code: CLIENT.countryCode,
    p_base_currency: CLIENT.currency,
    p_form_of_address: 'tu',
  });
  const currency = CLIENT.currency;

  // Un perfil recién creado no tiene supuestos: la fila se crea aquí.
  await advisor.insert('case_settings', {
    client_id: clientId,
    cutoff_date: CUTOFF_DATE,
    active_stages: ['presupuesto', 'deudas'],
  });
  await advisor.insert(
    'incomes',
    INCOMES.map(({ name, amount }, index) => ({
      client_id: clientId,
      name: name[language],
      kind: 'laboral',
      currency,
      amount,
      is_net: true,
      sort_order: index,
    })),
  );
  await advisor.insert(
    'budget_items',
    EXPENSES.map(({ category, concept, amount, essential }, index) => ({
      client_id: clientId,
      category,
      concept: concept[language],
      currency,
      amount,
      frequency: MONTHLY,
      expense_type: 'directo',
      essential,
      sort_order: index,
    })),
  );

  const [bank] = await advisor.insert<{ id: string }>('banks', {
    client_id: clientId,
    name: BANK[language],
  });
  await advisor.insert('pockets', {
    client_id: clientId,
    kind: 'emergencia',
    name: EMERGENCY_POCKET[language],
    currency,
    bank_id: bank?.id ?? null,
  });
  const pockets = await advisor.insert<{ id: string; name: string }>(
    'pockets',
    POCKETS.map((pocket, index) => ({
      client_id: clientId,
      name: pocket.name[language],
      currency,
      initial_balance: 0,
      bank_id: bank?.id ?? null,
      sort_order: index + 1,
    })),
  );
  const pocketId = new Map(pockets.map((pocket) => [pocket.name, pocket.id]));
  await advisor.insert(
    'budget_items',
    POCKETS.map((pocket, index) => ({
      client_id: clientId,
      category: pocket.category,
      concept: pocket.concept[language],
      currency,
      amount: pocket.amount,
      frequency: pocket.frequency,
      expense_type: 'bolsillo',
      essential: false,
      pocket_id: pocketId.get(pocket.name[language]) ?? null,
      sort_order: EXPENSES.length + index,
    })),
  );

  await advisor.insert(
    'debts',
    DEBTS.map(({ name, ...debt }, index) => ({
      client_id: clientId,
      name: name[language],
      currency,
      sort_order: index,
      ...debt,
    })),
  );
  await advisor.insert('reality_check', {
    client_id: clientId,
    currency,
    savings_n_ago: 1_800_000,
    n_months: 6,
    savings_today: 4_300_000,
  });

  const clientUserId = await accounts.ensure(CLIENT.email, password);
  await admin.update('clients', `id=eq.${clientId}`, {
    owner_user_id: clientUserId,
    status: 'activo',
  });
  return clientId;
}
