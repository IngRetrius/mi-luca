/**
 * Catálogos en inglés (ADR 0022): nombre de cada concepto por país y llave, bolsillos y notas. Lo
 * marcado desde la interfaz en inglés se guarda con estos nombres; la categoría se guarda siempre
 * con su valor canónico en español (`canonicalCategory`). La prueba exige una traducción para cada
 * concepto, bolsillo y nota de los catálogos en español.
 */

const SHARED: Readonly<Record<string, string>> = {
  'internet-tv': 'Internet and TV',
  housekeeping: 'Cleaning or domestic help',
  'home-maintenance': 'Home maintenance',
  groceries: 'Groceries',
  restaurants: 'Restaurants and eating out',
  'food-delivery': 'Food delivery',
  fuel: 'Fuel',
  'parking-tolls': 'Parking and tolls',
  'public-transport': 'Public transport and ride apps',
  'car-insurance': 'Car insurance',
  'car-maintenance': 'Car maintenance',
  pharmacy: 'Pharmacy',
  therapy: 'Therapy or psychology',
  gym: 'Gym',
  supplements: 'Supplements',
  'hair-nails': 'Hair and nails',
  skincare: 'Skincare',
  clothing: 'Clothing and footwear',
  'school-fees': 'School or university (monthly fee)',
  'enrollment-supplies': 'Enrollment and school supplies',
  'children-allowance': "Children's expenses and allowance",
  'family-support': 'Support for relatives',
  'pet-food': 'Pet food',
  'pet-grooming': 'Pet bathing and grooming',
  vet: 'Vet and vaccines',
  'mobile-phone': 'Mobile phone',
  subscriptions: 'Subscriptions',
  'domestic-trip': 'Domestic trip',
  outings: 'Outings and entertainment',
  celebrations: 'Christmas, birthdays and celebrations',
  'one-off-purchases': 'One-off purchases (technology, home)',
};

export const CONCEPT_NAMES_EN: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  CO: {
    ...SHARED,
    rent: 'Rent or home loan payment',
    'building-fee': 'Building administration fee',
    utilities: 'Utilities',
    'mandatory-vehicle-insurance': 'SOAT (mandatory vehicle insurance)',
    'private-health-plan': 'Prepaid medicine or supplementary health plan',
    'property-tax': 'Property tax (predial)',
    'vehicle-tax': 'Vehicle tax',
    'income-tax': 'Income tax payable',
    'tax-advisor': 'Accountant',
    'social-security': 'Health, pension and ARL (amount per payment month)',
    'savings-fund': 'Savings in a cooperative or fund',
    'voluntary-pension': 'Voluntary pension or AFC',
  },
  ES: {
    ...SHARED,
    rent: 'Rent or mortgage',
    'building-fee': "Homeowners' association fee",
    utilities: 'Electricity, water and gas',
    'private-health-plan': 'Private health insurance',
    'property-tax': 'Property tax (IBI)',
    'vehicle-tax': 'Vehicle tax',
    'income-tax': 'Income tax return payable',
    'tax-advisor': 'Tax advisor or gestor',
    'social-security': 'Self-employed contribution (amount per payment month)',
    'savings-fund': 'Savings in an account or fund',
    'voluntary-pension': 'Pension plan',
  },
};

/** Bolsillos sugeridos, por su nombre en español. */
export const POCKET_NAMES_EN: Readonly<Record<string, string>> = {
  Vehículo: 'Vehicle',
  'Salud y cuidado': 'Health and care',
  Ropa: 'Clothing',
  Educación: 'Education',
  'Hogar y mascotas': 'Home and pets',
  Viajes: 'Travel',
  Temporada: 'Seasonal',
  'Impuestos y trámites': 'Taxes and paperwork',
};

/** Notas de la plantilla, por su texto en español. */
export const HINTS_EN: Readonly<Record<string, string>> = {
  'Los seguros que ya existen van aquí, no en Seguros.':
    'Insurance already in place goes here, not in Insurance.',
  'Si se paga una vez al año, va como anual y tipo bolsillo.':
    'If it is paid once a year, record it as annual and pocket type.',
  'Los viajes con cálculo detallado van en Metas.':
    'Trips with a detailed calculation go in Goals.',
  'Confirmar con el contador.': 'Confirm with the accountant.',
  'Confirmar con el asesor fiscal.': 'Confirm with the tax advisor.',
  'Fondo anual para compras grandes.': 'Annual fund for large purchases.',
  'Los meses de pago se marcan en Ingresos.': 'Payment months are marked in Income.',
  'Es ahorro, no gasto.': 'It is savings, not spending.',
};
