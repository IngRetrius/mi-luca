import { looksLikeAccountNumber } from '@/lib/account-number';
import { parseAmount, parseDecimal, parsePercent } from '@/lib/amount';

export const NAME_MAX = 80;
export const NOTE_MAX = 500;
/** Una meta que se repite lo hace cada 1 a 50 años. */
const REPEAT_MAX = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Conceptos de la calculadora de viaje, en el orden de `Metas!B15:B22`, con su cantidad por
 * defecto. El alojamiento lleva los impuestos del alojamiento (RN-101).
 */
export const TRIP_CONCEPTS = [
  { key: 'tiquete', quantity: 1, isLodging: false },
  { key: 'alojamiento', quantity: 7, isLodging: true },
  { key: 'comida', quantity: 7, isLodging: false },
  { key: 'transporte', quantity: 1, isLodging: false },
  { key: 'atracciones', quantity: 1, isLodging: false },
  { key: 'seguro_viaje', quantity: 1, isLodging: false },
  { key: 'compras', quantity: 1, isLodging: false },
] as const;
export type TripConcept = (typeof TRIP_CONCEPTS)[number]['key'];

/** Colchón por tasa de cambio y comisiones por defecto (RN-101). */
export const DEFAULT_CUSHION = 0.05;

export type GoalField =
  | 'name'
  | 'amount'
  | 'currency'
  | 'alreadySaved'
  | 'repeatEveryYears'
  | 'targetDate'
  | 'tripCurrency'
  | 'tripLodgingTax'
  | 'tripCushion'
  | 'tripBaseCosts'
  | `trip_${TripConcept}_unit`
  | `trip_${TripConcept}_quantity`
  | 'note';
export type GoalFieldError =
  | 'missingName'
  | 'tooLong'
  | 'looksLikeAccount'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency'
  | 'invalidYears'
  | 'invalidDate'
  | 'missingWhen'
  | 'invalidPercent'
  | 'invalidQuantity';

export interface TripItemValues {
  readonly unit: string;
  readonly quantity: string;
}

export interface GoalValues {
  readonly name: string;
  readonly pocketId: string;
  readonly amount: string;
  readonly currency: string;
  readonly alreadySaved: string;
  readonly repeatEveryYears: string;
  readonly targetDate: string;
  readonly usesTrip: boolean;
  readonly tripCurrency: string;
  readonly tripLodgingTax: string;
  readonly tripCushion: string;
  readonly tripBaseCosts: string;
  readonly tripItems: Readonly<Record<TripConcept, TripItemValues>>;
  readonly note: string;
}

/** Una meta lista para guardar, con los nombres de columna de `goals`. */
export interface GoalRecord {
  readonly name: string;
  readonly pocket_id: string | null;
  readonly currency: string;
  readonly amount: number | null;
  readonly already_saved: number;
  readonly repeat_every_years: number | null;
  readonly target_date: string | null;
  readonly uses_trip_calculator: boolean;
  readonly trip_currency: string | null;
  readonly trip_lodging_tax_rate: number;
  readonly trip_cushion_rate: number;
  readonly trip_base_costs: number;
  readonly note: string | null;
}

/** Un concepto del viaje con valor (`goal_trip_items`). */
export interface TripItemRecord {
  readonly concept: TripConcept;
  readonly unit_value: number;
  readonly quantity: number;
  readonly is_lodging: boolean;
  readonly sort_order: number;
}

export type GoalErrors = Readonly<Partial<Record<GoalField, GoalFieldError>>>;

export type GoalParse =
  | {
      readonly ok: true;
      readonly values: GoalValues;
      readonly record: GoalRecord;
      readonly tripItems: readonly TripItemRecord[];
    }
  | { readonly ok: false; readonly values: GoalValues; readonly errors: GoalErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Valida una meta (RN-100, RN-101): con fecha objetivo o que se repite cada tantos años (si tiene
 * las dos, manda la repetición, como la plantilla). El valor es obligatorio salvo con la
 * calculadora de viaje, que lo calcula con sus conceptos en otra moneda.
 */
export function parseGoal(
  formData: FormData,
  {
    currencies,
    pocketIds,
  }: { readonly currencies: readonly string[]; readonly pocketIds: readonly string[] },
): GoalParse {
  const tripItems = Object.fromEntries(
    TRIP_CONCEPTS.map(({ key }) => [
      key,
      {
        unit: text(formData, `trip_${key}_unit`),
        quantity: text(formData, `trip_${key}_quantity`),
      },
    ]),
  ) as Record<TripConcept, TripItemValues>;
  const pocketId = text(formData, 'pocketId');
  const values: GoalValues = {
    name: text(formData, 'name'),
    pocketId: pocketIds.includes(pocketId) ? pocketId : '',
    amount: text(formData, 'amount'),
    currency: text(formData, 'currency'),
    alreadySaved: text(formData, 'alreadySaved'),
    repeatEveryYears: text(formData, 'repeatEveryYears'),
    targetDate: text(formData, 'targetDate'),
    usesTrip: formData.get('usesTrip') === 'on',
    tripCurrency: text(formData, 'tripCurrency'),
    tripLodgingTax: text(formData, 'tripLodgingTax'),
    tripCushion: text(formData, 'tripCushion'),
    tripBaseCosts: text(formData, 'tripBaseCosts'),
    tripItems,
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<GoalField, GoalFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > NAME_MAX) errors.name = 'tooLong';
  else if (looksLikeAccountNumber(values.name)) errors.name = 'looksLikeAccount';

  const amount = parseAmount(values.amount);
  if (amount === null && !values.usesTrip) errors.amount = 'missingAmount';
  else if (amount !== null && Number.isNaN(amount)) errors.amount = 'invalidAmount';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  const saved = parseAmount(values.alreadySaved);
  if (saved !== null && Number.isNaN(saved)) errors.alreadySaved = 'invalidAmount';

  const repeat = parseDecimal(values.repeatEveryYears, 1);
  if (repeat !== null && (Number.isNaN(repeat) || repeat <= 0 || repeat > REPEAT_MAX)) {
    errors.repeatEveryYears = 'invalidYears';
  }
  if (values.targetDate && !ISO_DATE.test(values.targetDate)) errors.targetDate = 'invalidDate';
  if (repeat === null && !values.targetDate) errors.targetDate = 'missingWhen';

  let lodgingTax = 0;
  let cushion = DEFAULT_CUSHION;
  let baseCosts = 0;
  const items: TripItemRecord[] = [];
  if (values.usesTrip) {
    if (!currencies.includes(values.tripCurrency)) errors.tripCurrency = 'invalidCurrency';
    const tax = parsePercent(values.tripLodgingTax);
    if (tax !== null && Number.isNaN(tax)) errors.tripLodgingTax = 'invalidPercent';
    else lodgingTax = tax ?? 0;
    const cushionValue = parsePercent(values.tripCushion);
    if (cushionValue !== null && Number.isNaN(cushionValue)) errors.tripCushion = 'invalidPercent';
    else cushion = cushionValue ?? DEFAULT_CUSHION;
    const base = parseAmount(values.tripBaseCosts);
    if (base !== null && Number.isNaN(base)) errors.tripBaseCosts = 'invalidAmount';
    else baseCosts = base ?? 0;
    TRIP_CONCEPTS.forEach((concept, index) => {
      const item = tripItems[concept.key];
      const unit = parseAmount(item.unit);
      const quantity = parseDecimal(item.quantity, 2);
      if (unit !== null && Number.isNaN(unit)) errors[`trip_${concept.key}_unit`] = 'invalidAmount';
      if (quantity !== null && Number.isNaN(quantity)) {
        errors[`trip_${concept.key}_quantity`] = 'invalidQuantity';
      }
      if (unit !== null && !Number.isNaN(unit) && unit > 0) {
        items.push({
          concept: concept.key,
          unit_value: unit,
          quantity: quantity === null || Number.isNaN(quantity) ? concept.quantity : quantity,
          is_lodging: concept.isLodging,
          sort_order: index,
        });
      }
    });
  }

  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';
  else if (looksLikeAccountNumber(values.note)) errors.note = 'looksLikeAccount';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      pocket_id: values.pocketId || null,
      currency: values.currency,
      amount: amount ?? null,
      already_saved: saved ?? 0,
      repeat_every_years: repeat,
      target_date: values.targetDate || null,
      uses_trip_calculator: values.usesTrip,
      trip_currency: values.usesTrip ? values.tripCurrency : null,
      trip_lodging_tax_rate: lodgingTax,
      trip_cushion_rate: cushion,
      trip_base_costs: baseCosts,
      note: values.note || null,
    },
    tripItems: items,
  };
}
