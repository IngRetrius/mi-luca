# Marco legal y textos pendientes

**Todo lo de esta carpeta es un borrador técnico para el abogado. No es asesoría legal y no se publica sin su validación.**

## 0. Responsable del tratamiento

**Juan Camilo Perea Possos**, persona natural, dueño de MiLuca (decisión A5 del 28/09/2026). **Supuesto:** con domicilio en Colombia; confirmar.

Consecuencias que el abogado debe validar:

- En Colombia, las personas naturales no están obligadas a inscribir sus bases de datos en el RNBD [F22].
- El RGPD aplica también a un responsable fuera de la UE que ofrece servicios a personas que están en la UE (art. 3.2), y puede exigir designar un representante en la UE (art. 27), salvo tratamiento ocasional y sin datos de categorías especiales a gran escala [F29]. Los datos de salud del presupuesto hacen que este punto importe.
- Los datos se alojan en Estados Unidos (Supabase us-east-2, ADR 0003): transferencia internacional para los clientes de España.

## 1. Marco que aplica

### 1.1 Asesoría en inversiones

| País | Norma | Qué dice (resumen) | Cómo encaja la plataforma |
|---|---|---|---|
| Colombia | Decreto 661 de 2018, que modifica el Decreto 2555 de 2010 [F18] | La asesoría en el mercado de valores la prestan entidades vigiladas por la Superintendencia Financiera, mediante personas inscritas en el RNPMV y certificadas (AMV). La recomendación profesional es una recomendación individual que tiene en cuenta el perfil del cliente y el del producto: una "opinión idónea sobre una determinada inversión" (art. 2.40.1.1.2). Las comunicaciones generales no son recomendación profesional y deben decirlo (art. 2.40.1.1.3) | La plataforma no se pronuncia sobre ninguna inversión determinada ni sobre productos: muestra capacidad de ahorro, plazos y rangos generales entre crecimiento y estabilidad |
| España | Ley 6/2023 de los Mercados de Valores y de los Servicios de Inversión [F20]; guía de la CNMV sobre asesoramiento [F19] | Para que haya asesoramiento deben darse a la vez cinco requisitos; los dos esenciales son una recomendación sobre **instrumentos financieros concretos** y que sea **personalizada**. Lo genérico "respecto a un tipo de activos o productos financieros" no cumple el segundo requisito (guía de 2010, anterior a la ley vigente) | La plataforma es personalizada, pero no recomienda instrumentos concretos. Queda la duda de los rangos por perfil: son personalizados sobre tipos de activo, no sobre instrumentos |

**Punto a validar por el abogado:** el módulo de inversión presenta una distribución personalizada entre "crecimiento" y "estabilidad" según edad, plazo y perfil. Es lo más cercano a una recomendación. La propuesta es mantenerla como rango orientativo, sin nombrar tipos de instrumento más específicos que los del protocolo (sección 8.7), con los avisos de la sección 2 y con la remisión a un profesional autorizado para elegir productos.

### 1.2 Protección de datos

| País | Norma | Puntos que afectan el diseño |
|---|---|---|
| Colombia | Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) [F28] | Autorización previa, expresa e informada, con prueba de su texto y fecha (tabla `consents`); datos de salud son sensibles (autorización explícita y facultativa); derechos de conocer, actualizar, rectificar y suprimir; transferencias internacionales solo a países con nivel adecuado según la SIC [F21]; las personas naturales no se inscriben en el RNBD [F22] |
| España y UE | Reglamento (UE) 2016/679, RGPD [F29] | Base jurídica y deber de información; datos de salud como categoría especial (consentimiento explícito); acceso, portabilidad, supresión y limitación; contratos con encargados (Supabase, Vercel, Resend) [F23]; notificación de brechas a la autoridad de control |

## 2. Redacción propuesta para el producto

Principio: describir lo que la plataforma hace (planificar, organizar, explicar) y nunca lo que no hace (recomendar productos). Estos textos van en `packages/i18n` y los usa la interfaz; el abogado los ajusta por país.

**Descripción del servicio (portada, términos, invitación):**

> MiLuca es una herramienta de planificación y educación financiera personal. Te ayuda a entender tus ingresos y gastos, organizar tu ahorro, preparar un fondo de emergencia, ordenar el pago de tus deudas y conocer tu capacidad para invertir. No recomienda productos financieros ni entidades, y no reemplaza a un profesional autorizado en inversiones, impuestos, pensiones o temas legales.

**Sección de inversión:**

> Aquí ves cuánto podrías destinar a invertir y un rango orientativo de cómo repartirlo entre crecimiento y estabilidad, según tu edad, tu plazo y tu perfil de riesgo. No es una recomendación de comprar, vender o mantener ningún producto, valor o fondo, ni de ninguna entidad. Para elegir productos, consulta a un profesional autorizado: en Colombia, inscrito en el Registro Nacional de Profesionales del Mercado de Valores; en España, una entidad autorizada por la CNMV.

**Leyenda para Colombia en comunicaciones con cifras de inversión** (en línea con el art. 2.40.1.1.3 [F18]):

> El contenido de esta comunicación no constituye una recomendación profesional.

**Proyecciones:**

> Proyección ilustrativa en [pesos | euros] de hoy, calculada con rendimientos supuestos. No es una promesa ni una garantía de resultados.

**Remisiones:**

> Este punto es tributario: confírmalo con tu contador (Colombia) o con tu gestor o asesor fiscal (España).
> Esta estimación de pensión es orientativa: pide el cálculo oficial a tu administradora de pensiones (Colombia) o a la Seguridad Social (España).
> Este tema es legal o sucesoral: consúltalo con un abogado o una notaría.

**Expresiones que la interfaz no usa** (el control de calidad las busca en la carta y las notas): "te recomendamos invertir en", "compra", "vende", "el mejor fondo", "rentabilidad asegurada", "sin riesgo", "asesoría de inversión", nombres de productos, fondos, acciones, ETF o entidades.

## 3. Documentos a redactar (con el abogado)

| Documento | País | Dónde se usa | Fase |
|---|---|---|---|
| Autorización de tratamiento de datos | Colombia | P-C02, tabla `legal_texts` (`tratamiento_datos`) | F1 |
| Información sobre protección de datos (art. 13 RGPD) y base jurídica | España | P-C02 | F1 |
| Consentimiento explícito para datos de salud | Ambos | P-C02, casilla aparte | F1 |
| Política de privacidad | Ambos | Enlace permanente | F1 borrador, F8 final |
| Términos de uso y alcance del servicio | Ambos | P-C01, P-G01 | F1 borrador, F8 final |
| Aviso de alcance de la asesoría (sección 7 de la carta) | Ambos | Carta y plan | F7 |
| Lista de encargados del tratamiento y sus contratos | Ambos | Política de privacidad | F0 |
| Procedimiento de atención de derechos y plazos | Ambos | P-C11, operación | F7 |
| Política de conservación y borrado | Ambos | Tarea de borrado, `deletion_receipts` | F7 |
| Protocolo ante brechas de seguridad | Ambos | Operación | F8 |

## 4. Preguntas para el abogado

1. ¿El módulo de inversión, tal como está descrito, queda fuera de la asesoría regulada en Colombia y en España? ¿Qué cambiarías?
2. Como persona natural con domicilio en Colombia que atiende clientes en España, ¿necesito un representante en la UE (art. 27 del RGPD)? ¿Conviene constituir una empresa?
3. Con los datos en Estados Unidos (Supabase us-east-2), ¿basta el DPA de Supabase y su evaluación de transferencias para los clientes de España? Para Colombia, ¿basta la declaración de nivel adecuado de la SIC para Estados Unidos?
4. ¿Qué debe conservar el asesor si el cliente pide el borrado o revoca el acceso (evidencia de la asesoría, facturación)?
5. ¿Plazo máximo para atender una solicitud de borrado o exportación en cada país?
6. ¿Basta el consentimiento explícito para los datos de salud del presupuesto, o conviene evitar esos datos del todo?
7. ¿Qué plazos y a qué autoridad hay que notificar una brecha de seguridad en cada país?
8. ¿Hace falta un registro de actividades de tratamiento en España para este volumen?
