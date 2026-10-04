import type Anthropic from '@anthropic-ai/sdk';

import {
  assetTypeSchema,
  clientTypeSchema,
  dropReactionSchema,
  expenseTypeSchema,
  frequencySchema,
  incomeKindSchema,
  insuranceStatusSchema,
  investingExperienceSchema,
  investmentBucketSchema,
  moneyHorizonSchema,
  payerSchema,
} from '@miluca/domain';
import { messages } from '@miluca/i18n';

import { DEBT_TYPES } from '@/features/debts';
import { INSURANCE_TYPES } from '@/features/insurance';

type Tool = Anthropic.Beta.BetaTool;
type Property = Record<string, unknown>;

const text = (description: string): Property => ({ type: 'string', description });
const number = (description: string): Property => ({ type: 'number', description });
const boolean = (description: string): Property => ({ type: 'boolean', description });
const oneOf = (values: readonly string[], description: string): Property => ({
  type: 'string',
  enum: [...values],
  description,
});
const date = (description: string): Property => ({ type: 'string', format: 'date', description });

const ID = text(
  'Id del registro que ya existe (sale del estado del caso o de lo que guardaste antes). Solo para corregirlo; sin id se crea uno nuevo.',
);
const CURRENCY = text(
  'Código ISO de la moneda (COP, EUR, USD…). Si no se dice, la moneda base del cliente. Otra moneda necesita su tasa registrada antes (save_fx_rate).',
);
const NOTE = text('Nota breve opcional, sin nombres completos ni números de cuenta.');

function tool(
  name: string,
  description: string,
  properties: Record<string, Property>,
  required: readonly string[] = [],
): Tool {
  return {
    name,
    description,
    input_schema: {
      type: 'object',
      properties,
      required: [...required],
      additionalProperties: false,
    },
  };
}

/**
 * Herramientas del agente, una por cosa que anota. Lo que no se dijo no se manda: al crear queda
 * vacío o con el valor por defecto de la pantalla; al corregir (con `id`) queda como estaba. El
 * orden y el texto son fijos para que la caché de la API los reutilice.
 */
export const AGENT_TOOLS: readonly Tool[] = [
  tool(
    'update_profile',
    'Corrige el perfil del cliente: fecha de nacimiento, sexo, personas a cargo y tipo de cliente. Manda solo lo que se dijo.',
    {
      birth_date: date('Fecha de nacimiento, AAAA-MM-DD.'),
      sex: oneOf(['mujer', 'hombre'], 'Sexo del cliente.'),
      dependents: number('Personas que dependen económicamente del cliente (entero).'),
      client_type: oneOf(
        clientTypeSchema.options,
        'empleado; contratista (honorarios con seguridad social propia); independiente_variable (ingreso que cambia mes a mes); pensionado; rentista (vive de rentas); mixto.',
      ),
    },
  ),
  tool(
    'save_income',
    'Anota o corrige un ingreso del cliente. El valor es lo que recibe en cada pago, tal como lo dijo; los meses dicen cuántos pagos hay en cada mes.',
    {
      id: ID,
      name: text(
        'Nombre corto: Salario, Honorarios, Arriendo del apartamento, Aporte de los papás…',
      ),
      kind: oneOf(
        incomeKindSchema.options,
        'laboral (trabajo, honorarios); renta (arriendos, dividendos); pension (pensión que recibe); otro.',
      ),
      amount: number('Valor de cada pago, sin separadores de miles.'),
      currency: CURRENCY,
      payments_by_month: {
        type: 'array',
        items: { type: 'integer' },
        description:
          'Doce enteros de enero a diciembre con el número de pagos de cada mes (0 si ese mes no recibe; 2 si recibe doble, como una prima). Si no se dijo, no lo mandes: vale 1 cada mes.',
      },
      is_net: boolean('true si el valor ya es neto (después de descuentos).'),
      note: NOTE,
    },
  ),
  tool(
    'save_expense',
    'Anota o corrige un gasto del presupuesto, con el valor de cada pago y cada cuánto se paga. No anotes cuotas de deudas (van con save_debt), primas de seguros que aún no tiene (van con save_insurance) ni aportes a metas (van con save_goal): la app los suma sola.',
    {
      id: ID,
      concept: text('Concepto: Arriendo, Mercado, Gasolina, Colegio…'),
      category: oneOf(messages.es.budget.categories, 'Categoría del presupuesto.'),
      amount: number('Valor de cada pago, sin separadores de miles. No lo conviertas a mensual.'),
      currency: CURRENCY,
      frequency: oneOf(
        frequencySchema.options,
        'Cada cuánto se paga ese valor. por_duracion es un gasto que dura unos días (manda duration_days); meses_seguridad_social es el que se paga en los meses con seguridad social.',
      ),
      duration_days: number('Solo con frecuencia por_duracion: días que dura cada compra.'),
      expense_type: oneOf(
        expenseTypeSchema.options,
        'directo (se paga cuando llega); bolsillo (se aparta cada mes en un bolsillo para un pago grande o irregular: SOAT, regalos, vacaciones); seg_social (salud, pensión y riesgos laborales del independiente); ahorro (ahorro programado: cooperativa, fondo voluntario). Si no se sabe, pregunta.',
      ),
      essential: boolean(
        'true si es indispensable para vivir (vivienda, comida, servicios, salud, transporte al trabajo).',
      ),
      payer: oneOf(
        payerSchema.options,
        'Quién lo paga: cliente, familia o tercero (otra persona).',
      ),
      payer_label: text(
        'Con payer familia o tercero: quién, sin nombre completo (los papás, la expareja).',
      ),
      pocket_id: text(
        'Id del bolsillo general donde se aparta (gastos tipo bolsillo). Si no existe, créalo antes con save_pocket.',
      ),
      is_temporary: boolean('true si es un gasto que se va a acabar pronto.'),
      is_health: boolean(
        'true si revela algo de salud (medicamentos, terapias, médico, prepagada).',
      ),
      note: NOTE,
    },
  ),
  tool(
    'save_debt',
    'Anota o corrige una deuda: saldo de hoy, tasa efectiva anual y cuota mínima mensual. Solo el nombre de la entidad, nunca números de tarjeta ni de crédito.',
    {
      id: ID,
      name: text('Nombre corto: Tarjeta principal, Crédito del carro, Préstamo de un familiar…'),
      debt_type: oneOf(DEBT_TYPES, 'Tipo de deuda.'),
      lender: text(
        'Nombre de la entidad o de quién prestó (sin nombre completo si es una persona).',
      ),
      balance: number('Saldo que debe hoy.'),
      currency: CURRENCY,
      annual_rate_percent: number(
        'Tasa efectiva anual en porcentaje (28 es 28 % EA). Un préstamo sin interés es 0.',
      ),
      min_payment: number('Cuota mínima mensual.'),
      accepts_extra: boolean('false si no acepta abonos extra a capital.'),
      extra_from_date: date('Desde qué fecha acepta abonos extra, si tiene restricción.'),
      note: NOTE,
    },
  ),
  tool(
    'save_goal',
    'Anota o corrige una meta: con fecha objetivo o que se repite cada tantos años (al menos una de las dos).',
    {
      id: ID,
      name: text('Meta: Viaje, Computador, Cuota inicial…'),
      amount: number('Lo que cuesta la meta.'),
      currency: CURRENCY,
      target_date: date('Fecha objetivo, AAAA-MM-DD.'),
      repeat_every_years: number(
        'Para una meta que se repite (un viaje cada 2 años): cada cuántos años.',
      ),
      already_saved: number('Lo que ya tiene ahorrado para esa meta.'),
      pocket_id: text(
        'Id del bolsillo general donde se guarda el aporte. Si no existe, créalo antes con save_pocket.',
      ),
      note: NOTE,
    },
  ),
  tool(
    'save_insurance',
    'Anota si el cliente tiene cada seguro y la prima anual cotizada de los que no tiene. Un seguro del catálogo ya registrado se corrige solo. Nunca nombres ni recomiendes aseguradoras.',
    {
      id: ID,
      insurance_type: oneOf(
        INSURANCE_TYPES,
        'hogar, arrendamiento, enfermedades_graves, renta_hospitalizacion, vida (vida e incapacidad permanente), complementario (plan complementario o prepagada), desempleo, vehiculo (todo riesgo) u otro (con custom_name).',
      ),
      custom_name: text('Solo con tipo otro: nombre del seguro.'),
      status: oneOf(insuranceStatusSchema.options, 'si (lo tiene), no o cotizando.'),
      annual_premium: number('Prima anual cotizada. Solo si se la cotizaron; no la inventes.'),
      currency: CURRENCY,
      beneficiaries: text('Beneficiarios, sin nombres completos (los hijos, la pareja).'),
      note: NOTE,
    },
  ),
  tool(
    'save_asset',
    'Anota o corrige un activo del patrimonio: cuentas y efectivo (liquido), inmuebles, vehículos u otros (aportes en cooperativas, cesantías). Las inversiones van con save_investment y lo que le deben con save_receivable.',
    {
      id: ID,
      name: text(
        'Nombre: Cuenta de ahorros en Banco A, Apartamento, Carro… Sin números de cuenta.',
      ),
      asset_type: oneOf(assetTypeSchema.options, 'liquido, inmueble, vehiculo u otro.'),
      value: number('Saldo de hoy o valor aproximado.'),
      currency: CURRENCY,
      generates_income: boolean('true si genera ingreso (un local arrendado).'),
      note: NOTE,
    },
  ),
  tool(
    'save_investment',
    'Anota o corrige una inversión que ya tiene (plataforma o tipo, sin número de cuenta). No recomiendes productos ni entidades.',
    {
      id: ID,
      name: text(
        'Plataforma o tipo: Plataforma de inversión, Fondo de pensiones voluntarias, CDT…',
      ),
      bucket: oneOf(
        investmentBucketSchema.options,
        'crecimiento (puede subir y bajar, para más de 3 años) o estabilidad (estable y disponible). Si no se sabe, no lo mandes.',
      ),
      balance: number('Saldo de hoy.'),
      currency: CURRENCY,
      note: NOTE,
    },
  ),
  tool('save_receivable', 'Anota o corrige dinero que le deben al cliente y le pagan por cuotas.', {
    id: ID,
    debtor: text('Quién debe, sin nombre completo: un hermano, un amigo, un socio.'),
    balance: number('Saldo que le deben.'),
    monthly_payment: number('Cuota mensual que le pagan.'),
    currency: CURRENCY,
    first_payment_date: date('Fecha del primer pago, AAAA-MM-DD.'),
    note: NOTE,
  }),
  tool(
    'save_pocket',
    'Crea o corrige un bolsillo general (una cuenta o subcuenta donde se aparta dinero para algo). El fondo de emergencia y los meses sin ingreso ya tienen el suyo.',
    {
      id: ID,
      name: text('Nombre: Seguros, Regalos, Vacaciones, Impuestos…'),
      purpose: text('Para qué es.'),
      bank_id: text('Id del banco donde está, si se sabe y existe en el estado del caso.'),
      currency: CURRENCY,
      initial_balance: number('Saldo que ya tiene hoy, si lo dijo.'),
    },
  ),
  tool(
    'save_fx_rate',
    'Registra o corrige la tasa de cambio que recibe el cliente para una moneda distinta de la base. Pídela si no la dijeron; no la inventes.',
    {
      currency: text('Código ISO de la moneda (USD, EUR…).'),
      rate_to_base: number(
        'Unidades de moneda base por 1 unidad de esa moneda (por ejemplo, 3900 pesos por dólar).',
      ),
      as_of: date('Fecha de la tasa; si no se dijo, hoy.'),
      note: NOTE,
    },
    ['currency', 'rate_to_base'],
  ),
  tool(
    'save_risk_answers',
    'Anota las respuestas del cliente sobre riesgo. Solo lo que respondió.',
    {
      drop_reaction: oneOf(
        dropReactionSchema.options,
        'Si su inversión bajara 15 % en un año: venderia, esperaria o invertiria_mas.',
      ),
      experience: oneOf(
        investingExperienceSchema.options,
        'Experiencia invirtiendo: ninguna, algo o bastante.',
      ),
      horizon: oneOf(
        moneyHorizonSchema.options,
        'En cuánto podría necesitar el dinero: menos_3, de_3_a_7 o mas_7 años.',
      ),
    },
  ),
  tool(
    'save_reality_check',
    'Anota la prueba de realidad: cuánto tenía ahorrado en total hace N meses y cuánto tiene hoy (cuentas, bolsillos e inversiones), sin herencias ni ventas.',
    {
      savings_months_ago: number('Ahorro total hace N meses.'),
      months: number('N: cuántos meses atrás (entero de 1 a 120).'),
      savings_today: number('Ahorro total hoy.'),
      currency: CURRENCY,
    },
  ),
];
