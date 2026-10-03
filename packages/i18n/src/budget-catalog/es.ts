import { concept, type BudgetCatalog } from './catalog';

/**
 * España. **Supuesto (G1):** los conceptos de la plantilla con el vocabulario de España, con las
 * mismas llaves, frecuencias, tipos y bolsillos. Cambian IBI por predial, comunidad por
 * administración y cuota de autónomos por salud, pensión y ARL; no hay SOAT porque el seguro
 * obligatorio va dentro del seguro del coche. Lo revisa el asesor.
 */
export const ES_CATALOG: BudgetCatalog = [
  {
    name: 'Vivienda',
    concepts: [
      concept('rent', 'Alquiler o hipoteca', 'mensual', 'directo', { essential: true }),
      concept('building-fee', 'Comunidad de propietarios', 'mensual', 'directo', {
        essential: true,
      }),
      concept('utilities', 'Luz, agua y gas', 'mensual', 'directo', { essential: true }),
      concept('internet-tv', 'Internet y televisión', 'mensual', 'directo', { essential: true }),
      concept('housekeeping', 'Limpieza o empleada del hogar', 'mensual', 'directo'),
      concept('home-maintenance', 'Mantenimiento del hogar', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Alimentación',
    concepts: [
      concept('groceries', 'Compra del supermercado', 'semanal', 'directo', { essential: true }),
      concept('restaurants', 'Restaurantes y salidas a comer', 'mensual', 'directo'),
      concept('food-delivery', 'Comida a domicilio', 'mensual', 'directo'),
    ],
  },
  {
    name: 'Transporte',
    concepts: [
      concept('fuel', 'Gasolina', 'mensual', 'directo', { essential: true }),
      concept('parking-tolls', 'Aparcamiento y peajes', 'mensual', 'directo'),
      concept('public-transport', 'Transporte público y apps', 'mensual', 'directo', {
        essential: true,
      }),
      concept('car-insurance', 'Seguro del coche', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Vehículo',
        hint: 'Los seguros que ya existen van aquí, no en Seguros.',
      }),
      concept('car-maintenance', 'Mantenimiento del coche', 'semestral', 'bolsillo', {
        pocket: 'Vehículo',
      }),
    ],
  },
  {
    name: 'Salud y bienestar',
    concepts: [
      concept('private-health-plan', 'Seguro médico privado', 'mensual', 'directo', {
        essential: true,
        health: true,
      }),
      concept('pharmacy', 'Farmacia', 'mensual', 'directo', { essential: true, health: true }),
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
      concept('skincare', 'Cuidado de la piel', 'cada_4_meses', 'bolsillo', {
        pocket: 'Salud y cuidado',
      }),
      concept('clothing', 'Ropa y calzado', 'anual', 'bolsillo', { pocket: 'Ropa' }),
    ],
  },
  {
    name: 'Hijos y familia',
    concepts: [
      concept('school-fees', 'Colegio o universidad (mensualidad)', 'mensual', 'directo', {
        essential: true,
      }),
      concept('enrollment-supplies', 'Matrículas y material escolar', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Educación',
      }),
      concept('children-allowance', 'Gastos y paga de los hijos', 'mensual', 'directo', {
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
      concept('mobile-phone', 'Móvil', 'mensual', 'directo', { essential: true }),
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
      concept('property-tax', 'IBI', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
      }),
      concept('vehicle-tax', 'Impuesto de circulación', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
      }),
      concept('income-tax', 'Declaración de la renta a pagar', 'anual', 'bolsillo', {
        essential: true,
        pocket: 'Impuestos y trámites',
        hint: 'Confirmar con el asesor fiscal.',
      }),
      concept('tax-advisor', 'Gestor o asesor fiscal', 'anual', 'bolsillo', {
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
        'Cuota de autónomos (valor por mes de pago)',
        'meses_seguridad_social',
        'seg_social',
        { essential: true, hint: 'Los meses de pago se marcan en Ingresos.' },
      ),
    ],
  },
  {
    name: 'Ahorro',
    concepts: [
      concept('savings-fund', 'Ahorro en cuenta o fondo', 'mensual', 'ahorro', {
        hint: 'Es ahorro, no gasto.',
      }),
      concept('voluntary-pension', 'Plan de pensiones', 'mensual', 'ahorro', {
        hint: 'Es ahorro, no gasto.',
      }),
    ],
  },
];
