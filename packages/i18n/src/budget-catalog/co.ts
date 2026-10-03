import { concept, type BudgetCatalog } from './catalog';

/**
 * Colombia: los 43 conceptos de la hoja Presupuesto de la plantilla (`Presupuesto!B13:M55`), con su
 * frecuencia, tipo, bolsillo, esencial y nota. Las categorías siguen el orden de `Listas!E`.
 */
export const CO_CATALOG: BudgetCatalog = [
  {
    name: 'Vivienda',
    concepts: [
      concept('rent', 'Arriendo o cuota de vivienda', 'mensual', 'directo', { essential: true }),
      concept('building-fee', 'Administración', 'mensual', 'directo', { essential: true }),
      concept('utilities', 'Servicios públicos', 'mensual', 'directo', { essential: true }),
      concept('internet-tv', 'Internet y televisión', 'mensual', 'directo', { essential: true }),
      concept('housekeeping', 'Aseo o empleada doméstica', 'mensual', 'directo'),
      concept('home-maintenance', 'Mantenimiento del hogar', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Alimentación',
    concepts: [
      concept('groceries', 'Mercado', 'semanal', 'directo', { essential: true }),
      concept('restaurants', 'Restaurantes y salidas a comer', 'mensual', 'directo'),
      concept('food-delivery', 'Domicilios', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Transporte',
    concepts: [
      concept('fuel', 'Gasolina', 'mensual', 'directo', { essential: true }),
      concept('parking-tolls', 'Parqueadero y peajes', 'mensual', 'directo'),
      concept('public-transport', 'Transporte público y apps', 'mensual', 'directo', {
        essential: true,
      }),
      concept('mandatory-vehicle-insurance', 'SOAT', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Vehículo',
      }),
      concept('car-insurance', 'Seguro del carro', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Vehículo',
        hint: 'Los seguros que ya existen van aquí, no en Seguros.',
      }),
      concept('car-maintenance', 'Mantenimiento del carro', 'semestral', 'bolsillo', {
        pocket: 'Vehículo',
      }),
    ],
  },
  {
    name: 'Salud y bienestar',
    concepts: [
      concept(
        'private-health-plan',
        'Medicina prepagada o plan complementario',
        'mensual',
        'directo',
        {
          essential: true,
          health: true,
        },
      ),
      concept('pharmacy', 'Droguería', 'mensual', 'directo', { essential: true, health: true }),
      concept('therapy', 'Terapias o psicología', 'mensual', 'directo', { health: true }),
      concept('gym', 'Gimnasio', 'mensual', 'directo', {
        hint: 'Si se paga una vez al año, va como anual y tipo bolsillo.',
      }),
      concept('supplements', 'Suplementos', 'por_duracion', 'bolsillo', {
        pocket: 'Salud y cuidado',
      }),
    ],
  },
  {
    name: 'Cuidado personal',
    concepts: [
      concept('hair-nails', 'Peluquería y uñas', 'mensual', 'directo'),
      concept('skincare', 'Skincare', 'cada_4_meses', 'bolsillo', { pocket: 'Salud y cuidado' }),
      concept('clothing', 'Ropa y calzado', 'anual', 'bolsillo', { pocket: 'Ropa' }),
    ],
  },
  {
    name: 'Hijos y familia',
    concepts: [
      concept('school-fees', 'Colegio o universidad (mensualidad)', 'mensual', 'directo', {
        essential: true,
      }),
      concept('enrollment-supplies', 'Matrículas y útiles', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Educación',
      }),
      concept('children-allowance', 'Gastos y mesadas de hijos', 'mensual', 'directo', {
        essential: true,
      }),
      concept('family-support', 'Ayudas a familiares', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Mascotas',
    concepts: [
      concept('pet-food', 'Comida de mascota', 'mensual', 'directo', { essential: true }),
      concept('pet-grooming', 'Baño y peluquería de mascota', 'mensual', 'directo'),
      concept('vet', 'Veterinario y vacunas', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Hogar y mascotas',
      }),
    ],
  },
  {
    name: 'Servicios',
    concepts: [
      concept('mobile-phone', 'Celular', 'mensual', 'directo', { essential: true }),
      concept('subscriptions', 'Suscripciones', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Viajes y ocio',
    concepts: [
      concept('domestic-trip', 'Viaje nacional', 'anual', 'bolsillo', {
        pocket: 'Viajes',
        hint: 'Los viajes con cálculo detallado van en Metas.',
      }),
      concept('outings', 'Salidas y entretenimiento', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Temporada',
    concepts: [
      concept('celebrations', 'Navidad, cumpleaños y celebraciones', 'anual', 'bolsillo', {
        pocket: 'Temporada',
      }),
    ],
  },
  {
    name: 'Impuestos y trámites',
    concepts: [
      concept('property-tax', 'Predial', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
      }),
      concept('vehicle-tax', 'Impuesto vehicular', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
      }),
      concept('income-tax', 'Impuesto de renta a pagar', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
        hint: 'Confirmar con el contador.',
      }),
      concept('tax-advisor', 'Contador', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
      }),
    ],
  },
  {
    name: 'Compras puntuales',
    concepts: [
      concept('one-off-purchases', 'Compras puntuales (tecnología, hogar)', 'anual', 'bolsillo', {
        pocket: 'Hogar y mascotas',
        hint: 'Fondo anual para compras grandes.',
      }),
    ],
  },
  {
    name: 'Seguridad social',
    concepts: [
      concept(
        'social-security',
        'Salud, pensión y ARL (valor por mes de pago)',
        'meses_seguridad_social',
        'seg_social',
        { essential: true, hint: 'Los meses de pago se marcan en Ingresos.' },
      ),
    ],
  },
  {
    name: 'Ahorro',
    concepts: [
      concept('savings-fund', 'Ahorro en cooperativa o fondo', 'mensual', 'ahorro', {
        hint: 'Es ahorro, no gasto.',
      }),
      concept('voluntary-pension', 'Pensión voluntaria o AFC', 'mensual', 'ahorro', {
        hint: 'Es ahorro, no gasto.',
      }),
    ],
  },
];
