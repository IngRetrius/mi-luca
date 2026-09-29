# 07. Preguntas abiertas

Cada punto pendiente tiene una recomendación. Si estás de acuerdo con todas, basta con decirlo; si no, indícame el número y tu decisión. "Cuándo" dice en qué momento bloquea el trabajo.

## Decisiones tomadas

| N.º | Decisión | Fecha | Dónde quedó reflejada |
|---|---|---|---|
| A1, A2 | **Casos de prueba de oro:** el agente anonimiza el caso de España y construye el de Colombia en la plantilla oficial; el asesor revisa antes de subirlos. C2 (España) revisado y aprobado por el asesor; C1 (Colombia) construido el 28/09/2026 y publicado en `main` ese día por decisión del asesor, antes de su revisión (A11 sigue abierta) | 28/09/2026 | `04-motor-de-calculo.md`, 7.2 y 7.3; `packages/engine/test/golden/` |
| Nueva | **Multimoneda en general:** cada importe (ingresos, gastos, bolsillos, deudas, metas, primas, activos, inversiones, cobros, control mensual) lleva su moneda con un selector; tasas por cliente y por moneda; cualquier país se puede habilitar | 28/09/2026 | RN-010, RN-017, RN-018; `03-modelo-de-datos.md` (principios 8 y 9, `client_fx_rates`); `05-pantallas-y-flujos.md` (P-A19) |
| A3 | **Región:** el proyecto de Supabase ya creado, en us-east-2 (Ohio); funciones de Vercel en `cle1` | 28/09/2026 | ADR 0003, `02-arquitectura.md` sección 7 |
| A4 | **Dedicación:** 14 horas por semana. MVP hacia junio o julio de 2027; lanzamiento entre abril y julio de 2028 | 28/09/2026 | `06-plan-de-trabajo.md` |
| A5 | **Responsable del tratamiento:** Juan Camilo Perea Possos, persona natural, dueño de MiLuca | 28/09/2026 | `legal/README.md` |
| B1 | **Aporte al fondo de emergencia:** se corrige en modo nativo con el plan de ahorro secuencial (primero el fondo, luego el reparto). Decidido por el agente a pedido del asesor | 28/09/2026 | ADR 0008 |
| D1 | **Marca:** se mantiene la paleta opción 3; el logo actual se usa de forma provisional hasta que lo actualices. Nombre del producto: MiLuca | 28/09/2026 | `diseno/tokens.md` sección 5 |
| D4 | **Tipografía:** Livvic (licencia OFL), alojada por la app. El asesor pidió Laca (Nova Type Foundry) [F38], pero solo está en la biblioteca completa de Adobe Fonts, que exige un plan pago de Creative Cloud que su cuenta no tiene; Livvic es la alternativa libre más parecida entre las comparadas (Radio Canada, Rosario, Alegreya Sans, Commissioner y otras). Cambia la recomendación de usar la fuente del sistema. Sin terceros: el navegador no pide nada a Google | 28/09/2026 | `diseno/tokens.md` sección 4 |
| D1b | **Logo:** movido a `docs/diseno/marca/logo.png` como archivo fuente; de ahí salen los iconos de la PWA | 28/09/2026 | `diseno/tokens.md` sección 5 |
| A10 | **Repositorio público** en GitHub (`IngRetrius/mi-luca`), por decisión del asesor, sabiendo que incluye el protocolo, las plantillas y el plan. Los libros de clientes siguen excluidos | 28/09/2026 | `.gitignore` |
| Nueva | **Inicio de sesión:** Google y correo con contraseña; Apple aplazado. Cambia la regla "solo Google y Apple" del encargo. El alta con contraseña solo es posible desde una invitación | 28/09/2026 | ADR 0009; `02-arquitectura.md` 5.2; `05-pantallas-y-flujos.md` (P-G01, P-G05, P-C12) |
| A9 | **Se mantiene el plan original:** el MVP incluye desde el inicio la cuenta del cliente, la invitación y el consentimiento (no se adelanta un "MVP del asesor"). MVP hacia junio o julio de 2027 a 14 horas por semana | 28/09/2026 | `06-plan-de-trabajo.md` |
| E5 | **Contraseña:** 8 caracteres o más, sin reglas de composición y con rechazo de contraseñas filtradas (Pro). Por debajo de los 15 que el NIST pide cuando la contraseña es el único factor [F36] | 28/09/2026 | ADR 0009, `supabase/config.toml` |
| Nueva | **Autorización de los clientes:** el asesor indica que ya tiene la autorización de todos sus clientes. El abogado confirma su alcance; la plataforma igual registra el consentimiento de cada cliente con fecha y texto | 28/09/2026 | `legal/README.md`, sección 0 |

## A. Antes de empezar la fase 0

| N.º | Pregunta | Contexto | Recomendación | Cuándo |
|---|---|---|---|---|
| A6 | ¿Cobras honorarios por la asesoría? | Confirma que el uso es comercial (Vercel Pro) y afecta el texto de alcance | Asumo que sí o que podrías hacerlo; por eso el plan usa Vercel Pro | F0 |
| A7 | ¿Tienes abogado en Colombia y en España? | Hay que validar protección de datos, transferencia a Estados Unidos de los datos de clientes de España y alcance de la asesoría en los dos países | Una firma con presencia en ambos o un abogado por país, desde la fase 0. Preguntas concretas en `legal/README.md` | F0 |
| A11 | ¿Apruebas el caso de oro C1 (Colombia)? | Construido en la plantilla oficial con seis supuestos, entre ellos seguridad social en 11 pagos (enero sí, febrero no) como en la sección 15 del protocolo, aunque la tabla del libro original marca 12. Reproduce todas las cifras de la sección 15 salvo la inversión anual (15,7 frente a 19,5 millones), porque la prueba de realidad está pendiente y la plantilla invierte el 50 % | Revisar los supuestos y el contraste en `packages/engine/test/golden/README.md` y los datos en `c1-colombia/inputs.json`; aprobar o indicar qué cambiar | F0 |
| A8 | Tolerancia de la prueba de oro para porcentajes | 0,01 sobre una razón es un punto porcentual | Importes ±0,01; razones ±0,000001; fechas y textos iguales | F0 |

## B. Reglas del cálculo (antes de F2 y F3)

| N.º | Pregunta | Recomendación | Cuándo |
|---|---|---|---|
| B2 | Si un tercero paga los gastos del cliente, ¿el fondo de emergencia se calcula sobre el gasto esencial total o solo sobre lo que paga el cliente? | Sobre el total, con el escenario "el tercero deja de pagar" (así se hizo en el caso de España) | F3 |
| B3 | ¿Qué hallazgos se corrigen en modo nativo? | Corregir H-01 (decidido), H-02, H-05, H-06, H-10, H-11, H-12, H-14, H-15 (decidido), H-16 y H-22. Documentar sin cambiar H-03, H-04, H-09, H-17, H-19, H-21. Decidir H-07, H-13, H-18, H-20, H-23 y H-24 contigo en F2 | F2 |
| B4 | ¿Modo por defecto de un cliente nuevo? | Nativo. El modo compatible queda para las pruebas de oro y para comparar con un Excel antiguo | F2 |
| B5 | ¿Se permiten 2 o más pagos de un ingreso en un mes (por ejemplo, la prima)? (H-22) | Sí, con ayuda que lo explique | F2 |
| B7 | ¿Las condiciones de capacidad del perfil de riesgo son automáticas o las decide el asesor? (H-16) | Sugeridas automáticamente y editables solo por el asesor, con registro | F5 |
| B8 | ¿Qué hace el módulo de pensión de España? | Informativo en el MVP: edad de referencia con fuente y remisión a la Seguridad Social; sin estimar la pensión | F6 |
| B9 | ¿Los umbrales del semáforo cambian por país? | Iguales para todos los países por ahora, guardados como parámetros para poder cambiarlos | F2 |
| B10 | ¿Qué parámetros de Colombia hay que verificar con fuente oficial antes de F6? | Salario mínimo 2026, reglas de semanas de Colpensiones y fondos privados, salud del pensionado, aportes de independientes. Hoy vienen del protocolo (sección 14) y necesitan fuente primaria | F6 |
| B11 | ¿Quién puede cambiar la tasa de cambio de una moneda? | El cliente y el asesor (es la tasa que el cliente recibe); el historial registra quién la cambió y el asesor ve el antes y después | F2 |
| B12 | ¿Una deuda en otra moneda se simula en su moneda o en la moneda base? | En su moneda, y se convierte con la tasa vigente para los totales; la sensibilidad muestra el riesgo cambiario | F4 |

## C. Cliente y datos

| N.º | Pregunta | Recomendación | Cuándo |
|---|---|---|---|
| C1 | ¿Se permite el registro libre en el futuro? | No en el MVP. El modelo ya lo soporta (cliente sin asesor), pero abre temas de soporte, abuso y alcance legal sin acompañamiento | Después del lanzamiento |
| C2 | ¿Qué conserva el asesor si el cliente revoca su acceso o pide el borrado? | Nada dentro de la plataforma, salvo lo que el abogado indique como obligación de conservación | F1 (con abogado) |
| C3 | ¿Plazo de gracia antes de borrar definitivamente? | 7 días para poder cancelar, dentro del plazo legal que confirme el abogado | F7 |
| C4 | ¿Cuánto dura una invitación? | 7 días, reenviable | F1 |
| C5 | ¿Cómo tratamos los datos de salud que aparecen en el presupuesto (terapias, medicamentos, lentes)? | Consentimiento explícito aparte y sugerencia de nombres genéricos ("Salud"). Son datos sensibles en Colombia y categoría especial en el RGPD [F28][F29] | F1 |
| C6 | ¿Cómo avisamos al asesor de los cambios del cliente? | Aviso dentro de la app al momento y un correo resumen como máximo una vez al día | F2 |
| C7 | ¿El cliente puede cambiar su país, su moneda base o su tipo de cliente? | No: cambian reglas y módulos, lo hace el asesor. Sí puede usar cualquier moneda en sus importes | F1 |
| C8 | ¿Cómo migramos a los clientes actuales? | En F8, uno por uno, con invitación y consentimiento nuevos; los datos se cargan desde su Excel con el extractor | F8 |
| C9 | ¿Sin conexión basta con leer el último plan? | Sí. Editar sin conexión obliga a resolver conflictos entre asesor y cliente | F1 |
| C10 | ¿El cliente registra el control mensual por categoría o movimiento por movimiento? | Por categoría, como la plantilla. Movimientos más adelante, si hace falta | F7 |
| C11 | ¿Una cuenta de asesor puede aceptar una invitación de cliente? | No. **Supuesto** aplicado en `accept_invitation`: evita que la misma cuenta sea asesor y dueño de un perfil, lo que confundiría la pantalla de inicio. Para probar el flujo de cliente, el asesor usa otra cuenta | F1 |
| C12 | ¿El asesor puede borrar un perfil de cliente? | Solo mientras nadie lo haya aceptado (borradores e invitaciones sin usar). **Supuesto** aplicado en RLS. Un perfil con dueño se borra solo por la solicitud del cliente (sección 9 del modelo de datos) | F1 |
| C13 | ¿El cliente puede cambiar el idioma y formato (`locale`) de su perfil? | No por ahora: va con el país y lo cambia el asesor. **Supuesto**; la matriz de permisos no lo menciona. Se puede abrir sin migrar datos | F1 |
| C14 | Mientras la app no envíe correos (Resend), ¿cómo llega la invitación? | El asesor copia el enlace en la ficha (P-A03) y lo envía por el medio que use con la persona. **Supuesto** aplicado. Consecuencia: la cuenta con contraseña se crea con el correo que escribió el asesor sin que el enlace haya pasado por ese buzón (ADR 0009 da por hecho que sí). P-C12 muestra el correo y pide una invitación nueva si no es el de la persona. Con Resend, el enlace va a ese correo y el supuesto desaparece | F1 (antes de clientes reales) |
| C15 | Sin los textos del abogado, ¿se pueden aceptar invitaciones en el proyecto remoto? | No: `accept_invitation` exige un texto de tratamiento de datos vigente del país y la migración no carga ninguno. En local hay textos de prueba (`supabase/seed/`). Un texto que ya tiene consentimientos no se puede borrar, así que no conviene cargar textos de prueba en producción: la prueba de sesión en iPhone con cuentas de prueba se hace en el proyecto de staging, con los textos de prueba | F1 |
| C16 | ¿Qué política de privacidad enlaza P-C02? | La que redacte el abogado, publicada como texto legal `privacidad`. Hasta entonces P-C02 no muestra el enlace | F1 (con abogado) |

## D. Producto y marca

| N.º | Pregunta | Recomendación | Cuándo |
|---|---|---|---|
| D2 | ¿El Excel exportado conserva la marca Petróleo y Oro? | Estructura, hojas y celdas idénticas a la plantilla (es lo que da la compatibilidad), con la marca MiLuca y las mismas convenciones de color de celdas (crema = editable) | F7 |
| D3 | Dominio | Comprar el dominio de MiLuca antes de configurar Google (la pantalla de consentimiento pide el dominio) y Resend (verifica el dominio desde el que se envían los correos). No verifiqué disponibilidad | F0 |
| D5 | ¿Nombre visible "MiLuca" en la pantalla de consentimiento de Google? | Sí, con verificación de marca (2 a 3 días hábiles) [F27] | F0 |

## E. Técnicas (confirmar)

| N.º | Pregunta | Recomendación | Cuándo |
|---|---|---|---|
| E1 | Identificadores de código en inglés y producto en español | Sí (ADR 0006), con glosario | F0 |
| E2 | Next.js en Vercel Pro | Sí (ADR 0002) | F0 |
| E3 | Segundo factor para el asesor | Fuera por ahora, como decidiste. Diseño listo para activarlo sin rehacer (02, 5.5). Sugiero reconsiderarlo antes de tener más de 20 clientes, porque la cuenta del asesor ve los datos de todos. Con contraseñas (ADR 0009), mientras tanto el asesor entra con Google y con la verificación en dos pasos de su cuenta de Google | Después del lanzamiento |
| E4 | ¿Dónde viven los parámetros de la metodología (70 %, 50 %, 90 %, umbrales)? | En `country_parameters` con país vacío (comunes) y versionados, igual que los del país | F2 |
