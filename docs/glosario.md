# Glosario

Términos del dominio en español (como los ve el usuario) y su identificador en el código (ADR 0006). Si agregas un término al código, agrégalo aquí en el mismo cambio.

| Español | Código | Nota |
|---|---|---|
| Asesor | `advisor` | |
| Cliente | `client` | La persona asesorada |
| Invitación | `invitation` | |
| Aceptar la invitación | `accept_invitation` | Función de Postgres que vincula la cuenta al perfil con el token |
| Crear perfil de cliente | `create_client` | Función de Postgres; crea el perfil y el acceso del asesor |
| Dueño del perfil | `owner_user_id` | Cuenta del cliente vinculada al perfil; vacía hasta aceptar |
| Perfil sin dueño | `is_unclaimed` | Borrador o invitado; el único que se invita o se borra desde la app |
| Acceso del asesor | `advisor_client_access` | Activo o revocado; lo controla el cliente |
| Revocar, restablecer | `revoked`, `active` | Estados del acceso del asesor |
| Tratamiento | `form_of_address` | tu, usted |
| País | `country` | Catálogo `countries` con moneda, formato y módulo de pensión |
| Gancho de registro | `before_user_created` | Cierra el registro público; solo pasan las altas con Google |
| Consentimiento | `consent` | |
| Entrar (iniciar sesión) | `signIn` | Pantalla P-G01, ruta `/entrar` |
| Cerrar sesión | `signOut` | Solo en el dispositivo actual (`scope: 'local'`) |
| Sesión | `session` | Usuario de la sesión: `SessionUser` |
| Ruta de retorno | `next` | Ruta interna a la que se vuelve después de entrar; se valida con `safeNextPath` |
| Fecha de corte | `cutoffDate` | Fecha a la que se refieren los cálculos |
| Año del flujo | `flowYear` | |
| Tipo de cliente | `clientType` | empleado, contratista, independiente_variable, pensionado, rentista, mixto |
| Supuestos del caso | `caseSettings` | Criterio del asesor |
| Parámetros por país | `countryParameters` | Versionados, con fuente |
| Moneda base | `baseCurrency` | |
| Tasa de cambio | `fxRate` | Unidades de moneda base por una unidad extranjera |
| Tasas del cliente | `clientFxRates` | Una por moneda distinta de la base, con fecha |
| Selector de moneda | `CurrencySelect` | Componente de `packages/ui` junto a cada campo de dinero |
| Importe con moneda | `Money` | `{ amount, currency }` |
| Ingreso | `income` | |
| Ingreso base (variable) | `baseIncome` | |
| Aporte implícito de terceros | `impliedThirdPartyIncome` | RN-015 |
| Presupuesto | `budget` | |
| Partida del presupuesto | `budgetItem` | |
| Frecuencia | `frequency` | |
| Veces al año | `timesPerYear` | |
| Tipo de gasto | `expenseType` | directo, bolsillo, seg_social, deuda, ahorro |
| Esencial | `essential` | |
| Pagador | `payer` | cliente, familia, tercero |
| Referencia familiar | `scope = 'referencia_familiar'` | No suma en cálculos |
| Gasto temporal | `isTemporary` | Por ejemplo, la matrícula |
| Costo de vida | `costOfLiving` | |
| Nivel esencial, básico, actual | `essentialLevel`, `basicLevel`, `currentLevel` | |
| Flujo anual | `cashflow` | |
| Balance del mes | `monthBalance` | |
| Meses sin ingreso | `noIncomeMonths` | |
| Faltante | `shortfall` | |
| Sobrante | `surplus` | |
| Margen libre | `freeMargin` | |
| Ahorro programado | `programmedSavings` | Cooperativas, fondos, pensión voluntaria |
| Prueba de realidad | `realityCheck` | |
| Cuenta por cobrar | `receivable` | |
| Banco | `bank` | Solo el nombre de la entidad |
| Bolsillo | `pocket` | |
| Cuenta operativa | `operatingAccount` | |
| Colchón operativo | `operatingCushion` | |
| Reparto del saldo | `balanceAllocation` | |
| Excedente | `excess` | |
| Aporte único | `lumpSum` | |
| Fondo de emergencia | `emergencyFund` | |
| Escenario A, B, C | `scenarioA`, `scenarioB`, `scenarioC` | |
| Meta completa, meta vigente | `fullGoal`, `currentGoal` | |
| Plan de ahorro secuencial | `sequentialSavingsPlan` | Modo nativo (H-01) |
| Deuda | `debt` | |
| Deuda cara | `expensiveDebt` | |
| Tasa efectiva anual | `annualRate` | |
| Cuota mínima | `minPayment` | |
| Abono extra | `extraPayment` | |
| Avalancha, bola de nieve, orden manual | `avalancha`, `bola_de_nieve`, `manual` | Valores de catálogo |
| Carga de deuda | `debtLoad` | Cuotas / ingreso mensual |
| Crédito (seguimiento) | `credit` | Plantilla de créditos |
| Cuota | `installment` | |
| Subsidio FRECH | `frechSubsidy` | Cobertura de tasa del gobierno de Colombia |
| Meta | `goal` | |
| Calculadora de viaje | `tripCalculator` | |
| Seguro | `insurance` | |
| Suma asegurada | `sumInsured` | |
| Patrimonio | `netWorth` | |
| Activo | `asset` | |
| Concentración | `concentration` | Inmuebles y vehículos sobre activos |
| Inversión | `investment` | |
| Perfil de riesgo | `riskProfile` | |
| Disposición | `riskWillingness` | Lo que quiere asumir |
| Capacidad | `riskCapacity` | Lo que puede asumir |
| Crecimiento, estabilidad | `growth`, `stability` | |
| Posición en el rango | `rangePosition` | |
| Proyección ilustrativa | `projection` | |
| Pensión | `pension` | |
| Semanas cotizadas | `contributedWeeks` | |
| IBL | `ibl` | Ingreso base de liquidación (Colombia) |
| Mesada | `monthlyPension` | |
| Brecha pensional | `pensionGap` | |
| Resumen | `summary` | |
| Semáforo: bien, atención, alerta | `ok`, `warning`, `alert` | |
| Pendientes | `pendingItems` | |
| Control mensual | `monthlyControl` | |
| Plan de acción | `actionPlan` | |
| Tarea | `actionItem` | |
| Notas para el cliente | `clientNotes` | |
| Carta de cierre | `closingLetter` | |
| Ficha de continuidad | `continuitySheet` | |
| Plan entregado | `planDelivery` | Versión fija |
| Cifras clave | `keyFigures` | |
| Antes y después | `changeImpact` | |
| Historial de cambios | `auditLog` | |
| Control de calidad | `qualityChecks` | |
| Modo compatible, modo nativo | `compatible`, `native` | Opción del motor |
