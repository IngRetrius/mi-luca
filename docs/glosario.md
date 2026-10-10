# Glosario

Términos del dominio en español (como los ve el usuario) y su identificador en el código (ADR 0006). Si agregas un término al código, agrégalo aquí en el mismo cambio.

| Español | Código | Nota |
|---|---|---|
| Asesor | `advisor` | |
| Cliente | `client` | La persona asesorada |
| Invitación | `invitation` | |
| Aceptar la invitación | `accept_invitation` | Función de Postgres que vincula la cuenta al perfil con el token |
| Crear perfil de cliente | `create_client` | Función de Postgres; crea el perfil y el acceso del asesor |
| Rol de la sesión | `Viewer` (`advisor`, `client`, `none`) | Se resuelve con `getViewer` en `src/server/viewer.ts` |
| Nombre visible | `display_name` / `displayName` | Cómo aparece el cliente en la lista y cómo lo saluda la app |
| Estado del perfil | `status` | borrador, invitado, activo, borrado_solicitado |
| Clientes, nuevo cliente, ficha | `/clientes`, `/clientes/nuevo`, `/clientes/[id]` | P-A01, P-A02, P-A03 |
| Sin invitación | `/sin-invitacion` | P-G02 |
| Dueño del perfil | `owner_user_id` | Cuenta del cliente vinculada al perfil; vacía hasta aceptar |
| Perfil sin dueño | `is_unclaimed` | Borrador o invitado; el único que se invita o se borra desde la app |
| Acceso del asesor | `advisor_client_access` | Activo o revocado; lo controla el cliente |
| Revocar, restablecer | `revoked`, `active` | Estados del acceso del asesor |
| Tratamiento | `form_of_address` | tu, usted |
| País | `country` | Catálogo `countries` con moneda y formato |
| Gancho de registro | `before_user_created` | Cierra el registro público; solo pasan las altas con Google |
| Consentimiento | `consent` | Fila de `consents`: qué texto legal exacto aceptó (o no) el cliente, cuándo y desde qué navegador |
| Texto legal | `legal_text` | Fila de `legal_texts`: tipo, país, versión y cuerpo con su sha256. No cambia una vez publicado |
| Textos legales vigentes | `current_legal_texts` | Función de Postgres: la última versión publicada de cada tipo para un país |
| Tratamiento de datos, datos sensibles | `tratamiento_datos`, `datos_sensibles` | Tipos de texto legal de P-C02: obligatorio y facultativo (salud) |
| Ver una invitación | `get_invitation` | Función de Postgres que, con el token y sin sesión, devuelve el estado y lo que P-C01 muestra |
| Enlace de invitación | `/invitacion/[token]` | P-C01; el token pasa luego a una cookie del flujo |
| Consentimiento, crear tu acceso | `/invitacion/consentimiento`, `/invitacion/acceso` | P-C02, P-C12 |
| Aceptar desde el flujo | `acceptFromFlow`, `/invitacion/aceptar` | Llama a `accept_invitation` con el token y los textos aceptados |
| Anular una invitación | `revokeInvitation` | Pone `revoked_at`; el enlace deja de servir |
| Agregar a inicio | `/instalar`, `InstallGuide` | P-C03; instrucciones según `detectPlatform` (`ios`, `android`, `other`) |
| Privacidad y datos | `/privacidad-y-datos` | P-C11 |
| Retirar o devolver el acceso del asesor | `setAdvisorAccess` | Cambia `advisor_client_access.status` a `revoked` o `active` |
| Retirar el consentimiento de datos de salud | `withdrawSensitiveConsent`, `consents.withdrawn_at` | P-C11 |
| Borrar cuentas sin perfil | `private.delete_unclaimed_accounts` | Tarea diaria de `pg_cron`, `delete-unclaimed-accounts` |
| Borrar los datos de un cliente | `private.delete_client_data` | A pedido del cliente; la ejecuta el responsable en el editor SQL (`supabase/README.md`) |
| Etapa de la asesoría | `CaseStage` (`presupuesto`, `deudas`, `patrimonio`) | ADR 0025; catálogo `CASE_STAGES` en `packages/domain` |
| Datos básicos (núcleo) | `core` | Perfil, ingresos, monedas y supuestos: siempre activos, no son una etapa |
| Etapas activas | `case_settings.active_stages` / `loadActiveStages` | Las activa el asesor; sin fila de supuestos, solo presupuesto |
| Etapa de la entrega | `plan_deliveries.stage` / `DeliveryStage` | Una etapa o `completo` (las entregas anteriores al ADR 0025) |
| Pasos de la etapa | `coreSteps`, `stageSteps`, `nextStep` | Se marcan solos con los datos del caso (`features/stages/progress.ts`) o los omite el asesor |
| Paso omitido | `case_settings.skipped_steps` / `SKIPPABLE_STEPS`, `setStepSkipped`, `StepSkip` | Paso opcional que el asesor salta; cuenta como hecho (ADR 0029) |
| Etapa terminada | `stageComplete` | Todos sus pasos hechos u omitidos, con el reporte entregado |
| Documentos del cliente | `client_files` / `ClientFile`, `features/client-files` | Extractos y soportes que sube el cliente para la videollamada; temporales (ADR 0030). No confundir con la carta y las notas (`client_documents`) |
| Tipo de documento | `ClientFileKind` (`tarjeta`, `cuenta`, `credito`, `ingresos`, `otro`) | Extracto de tarjeta, de cuenta, de crédito, soporte de ingreso u otro |
| Ya los revisé | `markFilesReviewed` | El asesor borra los documentos activos; motivo `revisado` |
| Transición de pantalla | `PageTransition`, `NAV_FORWARD`, `NAV_BACK` | Adelante, atrás o fundido entre pantallas (ADR 0031) |
| Moneda que cae | `CoinSlot` | El momento de marca: en el landing y en el inicio del cliente |
| Borrado diario | `purgeClientFiles`, `/api/cron/documentos`, `client_files_orphans`, `CRON_SECRET` | Cron de Vercel: vence los documentos de 30 días y borra los archivos sin fila activa |
| Controles de la etapa | `reportForStage`, `STAGE_CHECKS`, `COMMON_CHECKS` | Filtran la salida de `qualityChecks` sin tocar el motor |
| Buscar clientes | `?q=`, `parseSearch` | P-A01 |
| Recuperar contraseña | `/recuperar`, `recoverPassword` | P-G05; pasos `email`, `code`, `password` |
| Aviso | `notification` / `Notice` | Fila de `notifications`; tipo `invitacion_aceptada` |
| Marcar como visto | `markNoticeRead`, `read_at` | |
| Generar la migración de textos legales | `tools/legal-texts/build_migration.py` | Desde `docs/legal/textos/` |
| Pantalla solo del cliente | `requireClient` | Guarda de `src/server/viewer.ts`; otro rol va a su inicio |
| Trato | `form_of_address` / `FormOfAddress` (`tu`, `usted`) | Los textos del cliente vienen en las dos variantes y se eligen con `withAddress`; lo que no tiene variantes, con la capa en usted (`messagesFor`) |
| Entrar (iniciar sesión) | `signIn` | Pantalla P-G01, ruta `/entrar` |
| Cerrar sesión | `signOut` | Solo en el dispositivo actual (`scope: 'local'`) |
| Sesión | `session` | Usuario de la sesión: `SessionUser` |
| Ruta de retorno | `next` | Ruta interna a la que se vuelve después de entrar; se valida con `safeNextPath` |
| Fecha de corte | `cutoffDate` | Fecha a la que se refieren los cálculos |
| Fecha | `IsoDate` | Texto "AAAA-MM-DD", sin hora ni zona |
| Meses completos entre fechas | `datedifMonths` | `DATEDIF(inicio, fin, "m")` de Excel |
| Sumar meses a una fecha | `edate` | `EDATE` de Excel |
| Índice del mes | `monthIndex` | `AÑO*12 + MES`, como compara meses la plantilla |
| Redondeo hacia afuera | `roundUp` | `ROUNDUP` de Excel |
| Año del flujo | `flowYear` | |
| Tipo de cliente | `clientType` | empleado, contratista, independiente_variable, pensionado, rentista, mixto |
| Supuestos del caso | `caseSettings` | Criterio del asesor |
| Control de calidad | `qualityChecks`, `QcReport`, `QcItem` | Antes de entregar; niveles `blocking`, `note`, `warning` |
| Plan entregado | `plan_deliveries`, `Delivery` | Foto inmutable del caso el día de la entrega |
| Mis datos: bolsillos, cobros, patrimonio, prueba de realidad (rutas del cliente) | `/mis-datos/bolsillos`, `/mis-datos/cobros`, `/mis-datos/patrimonio`, `/mis-datos/prueba-de-realidad` | El cliente mantiene su plan (ADR 0011) |
| Entregar el plan, plan entregado, mi plan (rutas) | `/clientes/[id]/entrega`, `/clientes/[id]/planes/[deliveryId]`, `/mi-plan` | P-A12 y P-A14, vista del asesor, P-C05 |
| Comparar con hoy | `PlanView` (`today`) | Cifras clave entregadas frente a las de hoy |
| Supuestos del plan, pantalla | `/clientes/[id]/supuestos`, `PlanSettingsScreen` | Criterio del asesor (`case_settings`) |
| Flujo, fondo, bolsillos, cobros, patrimonio, prueba de realidad (rutas) | `/flujo`, `/fondo`, `/bolsillos`, `/cobros`, `/patrimonio`, `/prueba-de-realidad` | Dentro de `/clientes/[id]` |
| Semáforo | `StatusLabel` (`ok`, `warning`, `alert`) | Icono, color y texto: Bien, Atención, Alerta |
| Cómo va el plan | `planIndicators`, `PlanIndicators`, `IndicatorSummary` | Indicadores del plan entregado con semáforo y referencia del protocolo (ADR 0028) |
| Tabla de bolsillos | `pocketTable`, `PlanPockets` | Lo que se pasa a cada bolsillo al mes, en Mi plan y en el PDF |
| Estado del fondo con el plan secuencial | `fundPlanState`, `fundPlanText` | Completo, se completa en un mes o no se completa con el sobrante de hoy |
| Borrador de la carta | `letterDrafts` | Texto inicial de las etapas activas para las secciones vacías (ADR 0028) |
| Cuentas y saldos (paso de la etapa 1) | paso `accounts` | Activos líquidos: el saldo que reparte la etapa 1 |
| Lista de cifras | `FigureList` | Etiqueta y valor alineado a la derecha |
| Parece un número de cuenta | `looksLikeAccountNumber` | Ocho cifras seguidas o más; no se guardan (regla 9) |
| Porcentaje escrito | `parsePercent`, `percentToText` | De 0 a 100 en el campo; razón de 0 a 1 en la base |
| Parámetros del plan | `PlanParameters` | Meses de fondo, umbral de deuda cara, porcentajes y colchón ya resueltos para el caso |
| Metodología | `Methodology` / `method.*` | Parámetros comunes de `country_parameters`; valen si el asesor no fija otro |
| Parámetros por país | `countryParameters` | Versionados, con fuente |
| Moneda base | `baseCurrency` | |
| Tasa de cambio | `fxRate` | Unidades de moneda base por una unidad extranjera |
| Tasas del cliente | `clientFxRates` | Una por moneda distinta de la base, con fecha |
| Tasa oficial (sugerida) | `OfficialRate`, `officialRates` | La TRM o la del Banco Central Europeo para una moneda, en unidades de la base; se propone, no se guarda sola (ADR 0032) |
| Fuentes de la tasa oficial | `OfficialSources`, `loadOfficialSources` | Lo leído de la TRM (`TrmRow`) y del BCE (`EcbRow`); vacío si la fuente no responde |
| Tasa oficial en pantalla | `OfficialRateView`, `OfficialRateHint` | La tasa, su fuente y su fecha, con el botón "Usar esta tasa" |
| Menú de monedas | `CurrencyPicker`, `currencyOptions` / `CurrencyOption` | Las monedas comunes con su nombre y "Otra moneda" al registrar una tasa |
| Selector de moneda | `CurrencySelect` | Componente de `packages/ui` junto a cada campo de dinero |
| Importe con moneda | `Money` | `{ amount, currency }` |
| Ingreso | `income` | Tipos (`incomeKind`): laboral, renta, pension, otro |
| Pagos por mes | `paymentsByMonth` / `MonthFlags` | Doce marcas, de enero a diciembre |
| Meses con seguridad social | `socialSecurityPayments` | `Ingresos!S17` |
| Ingreso base (variable) | `baseIncome` / `variable_income_history` | Calculadora en `/ingresos/ingreso-base` |
| Va todo a ahorro | `allocation = 'ahorro_total'` | RN-014 |
| Escenario en que se pierde un ingreso | `lostInScenario` / `lost_in_scenario` (`IncomeScenario`) | a, b, c, ninguno; sin marca, según el tipo (H-07) |
| Ingreso estable | `ninguno` | No se pierde en ningún escenario del fondo |
| Pagos en cada mes | `payments_by_month` | De 0 a 9 por mes |
| Aporte implícito de terceros | `impliedThirdPartyIncome` | RN-015; pagadores `ThirdPartyPayer` (familia, tercero) |
| Indicadores personales | `personalIndicators` | Modo nativo (ADR 0010) |
| Ingreso propio, aporte de terceros, ingreso total | `ownIncome`, `thirdPartyContribution`, `totalIncome` | |
| Gasto propio, ahorro propio | `ownExpenses`, `ownProgrammedSavings` | |
| Tasa de ahorro sobre el ingreso propio | `ownSavingsRate` | |
| Presupuesto | `budget` | |
| Partida del presupuesto | `budgetItem` | |
| Filas automáticas del presupuesto | `automaticRows` | Cuotas de deudas, seguros nuevos y aportes a metas (RN-028) |
| Frecuencia | `frequency` | semanal, quincenal, mensual, bimestral, trimestral, cada_4_meses, semestral, anual, cada_2_anos, por_duracion, meses_seguridad_social |
| Veces al año | `timesPerYear` | |
| Tipo de gasto | `expenseType` | directo, bolsillo, seg_social, deuda, ahorro |
| Esencial | `essential` | |
| Pagador | `payer` | cliente, familia, tercero |
| Totales por pagador | `byPayer` / `PayerTotals` | Gasto sin ahorro y ahorro programado de cada pagador |
| Referencia familiar | `scope = 'referencia_familiar'` | No suma en cálculos |
| Gasto temporal | `isTemporary` | Por ejemplo, la matrícula |
| Gasto de salud | `isHealth` / `is_health` | Pierde el detalle si se retira el consentimiento de datos de salud (C20) |
| Costo de vida | `costOfLiving` | |
| Nivel esencial, básico, actual | `CostLevel`: `essential`, `basic`, `current` | Niveles del costo de vida |
| Valor del nivel básico | `basicAmount` / `basic_amount` | Valor por pago, con la frecuencia y la moneda de la partida; lo propone el asesor |
| Umbral fiscal | `FiscalThreshold` | Parámetro del país; cuáles aplican se decide por cliente |
| Base del umbral | `ThresholdBasis` (`income`, `spending`, `assets`) | Con qué se compara: ingreso propio, gasto de cada nivel o patrimonio bruto (ADR 0027) |
| Topes para declarar renta (Colombia) | `tax.filing_gross_income`, `tax.filing_purchases`, `tax.filing_gross_assets` | 1.400 y 4.500 UVT del año gravable, en pesos |
| Patrimonio bruto | `netWorth.totalAssets` / `grossAssetsExceeds` | Todos los activos, inversiones y cobros, sin restar deudas |
| Flujo anual | `cashflow` / `monthlyFlow` | Entradas y salidas de cada mes del año del flujo (`Flujo anual!E7:Q19`) |
| Valores por mes, fila del flujo | `MonthValues`, `FlowRow` | Doce valores de enero a diciembre; la fila lleva además el total del año |
| Balance del mes | `balance` | Entradas menos salidas (`Flujo anual!E19:P19`) |
| Meses sin ingreso | `noIncomeMonths` | Bolsillo que cubre los meses en rojo con lo que se guarda en los positivos |
| Aporte igual, aporte proporcional | `aporte_igual`, `aporte_proporcional` (`NoIncomeMethod`) | Método del aporte a meses sin ingreso; `no_aplica` sin meses en rojo |
| Cobertura del faltante | `coverage` | De 0 a 1 (`Flujo anual!T27`) |
| Alerta de déficit | `deficitAlert` | El año cierra en rojo (`Flujo anual!B36`) |
| Faltante | `shortfall` | |
| Sobrante | `surplus` | |
| Margen libre | `freeMargin` | |
| Destino del sobrante | `surplusDestination` | A deudas, a inversión y margen; también los abonos de cobros |
| Ahorro programado | `programmedSavings` | Cooperativas, fondos, pensión voluntaria |
| Prueba de realidad | `realityCheck` / `reality_check` | |
| Estado de la prueba de realidad | `RealityCheckStatus` | pendiente, confirmada, revisar_gastos y, en modo nativo, revisar_presupuesto (ADR 0027) |
| Ahorro registrado hoy | `liquidAssets` + `investment.current.total` | Lo que la prueba de realidad ofrece como ahorro de hoy (ADR 0028) |
| Cuenta por cobrar | `receivable` | |
| Saldo pendiente en la fecha de corte | `pendingAtCutoff` | `Supuestos!I46:I48` |
| Abonos recibidos | `receivablesReceived` | Abonos de cobros en cada mes del flujo |
| % del cobro a inversión | `pctToInvestment` / `pct_to_investment` | Lo decide el asesor |
| Banco | `bank` | Solo el nombre de la entidad |
| Bolsillo | `pocket` | |
| Asistente (IA) | `CaptureAssistant`, `proposeCapture`, `features/assistant/` | ADR 0012; Claude Haiku 4.5 (`CAPTURE_MODEL`) desde el servidor (`askClaude`, `server-only`) |
| Agente de captura (botón flotante) | `AgentChat`, `sendToAgent`, `undoAgentAction`, `features/assistant/agent/` | ADR 0017; `claude-opus-5-5` (`AGENT_MODEL`); vive en `app/clientes/[id]/layout.tsx` |
| Herramientas del agente | `AGENT_TOOLS` (`update_profile`, `save_income`, `save_expense`, `save_debt`, `save_goal`, `save_insurance`, `save_asset`, `save_investment`, `save_receivable`, `save_pocket`, `save_fx_rate`, `save_risk_answers`, `save_reality_check`) | Cada una guarda con el validador de su pantalla (`saveEntity`) |
| Estado del caso (para el agente) | `caseSnapshot` | Una línea por registro con su id, sin el nombre del cliente |
| Guardado del agente | `AgentAction` (`entity`, `op`, `key`, `previous`) | Tarjeta del chat con Ver y Deshacer (`undoEntity`) |
| Propuesta del asistente | `CaptureProposal`, `CaptureItem` (`key`, `amount`, `frequency`, `quote`), `CaptureUnmatched` | `parseCaptureResponse` la valida contra la lista; `captureConcepts` arma la lista en el servidor |
| Qué hace la lista con cada propuesta | `CaptureStatus` (`ready`, `frequencyDiffers`, `noFrequency`, `needsDays`, `noAmount`, `present`) | `planCapture`; solo `ready` escribe el valor |
| Ayuda de un dato | `Help`, `HelpButton`, `HelpPanel` | `src/components/help.tsx`; en un campo, `Field` con `help` |
| Supuestos del plan entregado | `PlanAssumptions`, `Delivery.parameters` | `inputs.parameters` de `plan_deliveries`; los ven el asesor y el cliente |
| Catálogo de conceptos del presupuesto | `budgetCatalog`, `BUDGET_CATALOGS` | Uno por país en `packages/i18n/src/budget-catalog/`; un país nuevo agrega su archivo |
| Concepto del catálogo | `CatalogConcept` (`key`, `name`, `frequency`, `expenseType`, `pocket`, `essential`, `health`, `hint`) | La llave es la misma en todos los países si el concepto es equivalente |
| Gastos típicos (rutas) | `/presupuesto/lista`, `/mis-datos/gastos/lista` | P-A06b; `BudgetCatalogScreen`, `addCatalogItems` |
| Tipo de bolsillo | `kind` | emergencia, meses_sin_ingreso, general |
| Bolsillo del fondo o de meses sin ingreso | `SpecialPocketKind`, `/bolsillos/fondo`, `/bolsillos/meses-sin-ingreso` | Meta y saldo del motor; se elige su banco |
| Límite de bolsillos del banco | `max_pockets` | RN-073 |
| Bolsillos con aporte | `withContribution` | Para comparar con el límite del banco (`Bolsillos!C29`) |
| Cuenta operativa | `operatingAccount` | |
| Colchón operativo | `operatingCushion` | |
| Reparto del saldo | `computePockets` | Fondo, meses sin ingreso, saldos escritos y excedente (`Bolsillos!C21:C28`) |
| Disponible para repartir | `available` | Saldo líquido menos el colchón |
| Saldos que superan lo disponible | `overAllocated` | `Bolsillos!C30` |
| Excedente | `excess` | |
| Aporte único | `lumpSum` | |
| Fondo de emergencia | `emergencyFund` | |
| Escenario A, B, C | `scenarios.a`, `scenarios.b`, `scenarios.c` (`EmergencyScenarioId`) | Pierde el ingreso laboral, las rentas o los dos |
| Regla de 6 meses | `sixMonthRule` | Comparación con 6 meses de gasto total |
| Avance del fondo | `emergencyProgress` (`vsFullGoal`, `vsCurrentGoal`) | Frente a la meta completa y a la vigente (H-11) |
| Meta completa, meta vigente | `fullGoal`, `currentGoal` | |
| Plan de ahorro secuencial | `sequentialSavingsPlan` | Modo nativo (H-01, ADR 0008) |
| Meses hasta completar el fondo | `monthsToComplete`, `completionMonth` | |
| Deuda | `debt` | |
| Deuda cara | `expensiveDebt` | Con saldo y tasa en el umbral o más (RN-090) |
| Cuotas atrasadas o reporte negativo | `in_arrears` / `inArrears`, control `debt_in_arrears` | Marca de la deuda; pide explicar el acuerdo de pago (ADR 0027) |
| Cuota que no cubre los intereses | `paymentCoversInterest`, control `debt_payment_covers_interest` | Con esa cuota el saldo no baja |
| Tasa de usura de referencia | `debt.usury_rate` / `UsuryRate`, `usuryStatus` | Parámetro mensual de Colombia; marca deudas cerca o por encima (ADR 0028) |
| Umbral de deuda cara | `expensiveDebtThreshold` / `expensive_debt_threshold` | |
| Tasa efectiva anual | `annualRate` | |
| Cuota mínima | `minPayment` | |
| Totales de deudas | `debtTotals` | Saldo y cuotas mínimas (`Deudas!D21`, `F21`) |
| Abono extra | `extraPayment` | |
| Avalancha, bola de nieve, orden manual | `avalancha`, `bola_de_nieve`, `manual` | Valores de catálogo |
| Método de pago de deudas | `debtMethod` / `DebtMethod` | Avalancha, bola de nieve u orden manual (`Deudas!C6`) |
| Orden de pago | `classifyDebts`, `order`, `byOrder` | Lugar de cada deuda (1 es la primera en recibir abonos) |
| Lugar en el orden manual | `manualOrder` / `manual_order` | |
| Tipo de deuda | `debtType` / `debt_type` | `tarjeta_credito`, `libre_inversion`, `vehiculo`, `hipotecario`, `libranza`, `informal`, `otro` |
| Entidad acreedora | `lender_name` | Solo el nombre (regla 9) |
| Método de pago (columna) | `debt_method` | En `case_settings` |
| Tasa mensual | `monthlyRate` | (1 + EA)^(1/12) - 1 (`Deudas!I`) |
| ¿Acepta abonos extra?, abonos desde | `acceptsExtra`, `extraFrom` | RN-092 |
| Plan de pago de deudas | `debtPlan`, `simulateDebts` | Simulación mes a mes (`Deudas!E29:DT80`) |
| Primer mes del plan | `startMonth`, `debtPlanStart` | Mes siguiente al de corte (`Deudas!C11`) |
| Pago extra mensual | `extraMonthly` | Del sobrante (`Deudas!C8`) |
| Pago mensual total para deudas | `totalPayment` | Cuotas mínimas más el extra (`Deudas!C9`) |
| Abono único inicial | `lumpSum` | Del excedente del saldo de hoy (`Deudas!C10`) |
| Horizonte de la simulación | `horizonMonths` | 120 en el diagnóstico, 360 en créditos (RN-094) |
| Meses para pagar, fecha de salida | `monthsToPayoff`, `payoffDate` | |
| Más de 120 meses | `exceedsHorizon` | |
| Intereses con el plan, solo con la cuota | `interestWithPlan`, `interestMinimumOnly` | |
| No se paga (solo con la cuota) | `neverPaidWithMinimum` | La cuota no cubre el interés del mes |
| Ahorro en intereses | `interestSavings` | `Deudas!H22` |
| Salida de la deuda cara | `expensiveDebtPayoff` | `Deudas!C25`, `Resumen!C19` |
| ¿Y si se abona más? | `debtWhatIf`, `DebtExtraPayment` | Simulación del plan con un pago adicional; no se guarda |
| Salida de todas las deudas | `freedom` / `DebtFreedom` | |
| Meses que se adelanta, intereses que se ahorran | `monthsSaved`, `interestSaved` | |
| Carga de deuda | `debtLoad` | Cuotas / ingreso mensual |
| Crédito (seguimiento) | `credit` | Plantilla de créditos |
| Cuota | `installment` | |
| Subsidio FRECH | `frechSubsidy` | Cobertura de tasa del gobierno de Colombia |
| Seguimiento cuota a cuota | `tracking`, `creditSchedule` | Hoja "Crédito" de la plantilla de créditos |
| Tabla del crédito, cuota de la tabla | `CreditSchedule`, `Installment` | |
| Marca de pago | `InstallmentMark` / `debt_installments` | Pagada, fecha real, cuota distinta, abono extra (RN-099) |
| Cuota distinta este mes | `customPayment` / `custom_payment` | |
| Fecha de la primera cuota, número de esa cuota | `firstInstallmentDate`, `firstInstallmentNumber` | |
| Plazo total en cuotas | `totalInstallments` | |
| Seguros incluidos en la cuota | `insurance` / `insurance_in_payment` | RN-096 |
| Puntos y cuota final del FRECH | `frechPoints`, `frechUntilInstallment` | |
| Saldo de hoy | `currentBalance` | Saldo menos el capital de las cuotas pagadas (`'Crédito 1'!I6`) |
| Cuotas vencidas sin marcar | `overdueCount` | |
| Lo que paga el cliente | `clientPays` | Pago menos el subsidio |
| Puente hacia Deudas | `creditBridge` | `Panel!B95:H102` (ADR 0014) |
| Plan de pago de créditos | `creditsPaymentPlan` | Hoja Plan de pago, 360 meses |
| Solo con cuotas | `minimumOnly` | Pagando solo la cuota, sin extras |
| Panel de créditos | `creditsPanel` | Hoja Panel |
| Meses para salir de la deuda cara | `expensiveDebtMonths` | Cifra clave en meses; 121 es más de 120 |
| Tasa para el cliente con FRECH | `frechClientRate` | H-18 |
| Libre de deudas | `debtFree` | |
| Tramos del mes | `monthSegments` | Días 1 a 10, 11 a 20 y 21 a 31 |
| Hitos | `milestones` | Cuándo termina cada crédito y cuánto libera |
| Nivel de carga | `debtLoadLevel` | `sana`, `alta`, `muy_alta`, `critica` (`Datos!D21`) |
| Meta | `goal` | |
| Valor usado de la meta | `usedAmount` | El escrito o el de la calculadora de viaje, en moneda base (`Metas!F`) |
| Ya ahorrado | `alreadySaved` | |
| Se repite cada (años) | `repeatEveryYears` | |
| Fecha objetivo | `targetDate` | |
| Meses restantes | `monthsRemaining` | Al menos 1 (`Metas!J`) |
| Aporte mensual a la meta | `monthlyContribution` | `Metas!K` |
| Calculadora de viaje | `tripCalculator` / `tripCost` | |
| Impuestos del alojamiento | `lodgingTaxRate`, `isLodging` | |
| Colchón por tasa de cambio y comisiones | `cushionRate` | 5 % por defecto (RN-101) |
| Seguro | `insurance` | |
| ¿Lo tiene? (seguro) | `status` / `InsuranceStatus` | si, no, cotizando |
| Prima anual cotizada | `annualPremiumQuoted` | |
| Primas en cotización | `quotingPremiumsAnnual` | Parte de las primas nuevas que aún se cotiza (H-24) |
| Tipo de seguro | `insurance_type` | hogar, arrendamiento, enfermedades_graves, renta_hospitalizacion, vida, complementario, desempleo, vehiculo, otro |
| Años de apoyo, gasto a cubrir (seguro de vida) | `supportYears`, `annualToCover` / `life_support_years`, `life_annual_to_cover` | Los fija el asesor (H-10) |
| Bolsillo de las primas nuevas | `insurancePocket` / `insurance_pocket_id` | |
| Conceptos de la calculadora de viaje | `goal_trip_items`, `TRIP_CONCEPTS` | tiquete, alojamiento, comida, transporte, atracciones, seguro_viaje, compras |
| Primas de seguros nuevos | `newPremiumsAnnual` | `Seguros!H16` |
| Suma asegurada | `sumInsured` | |
| Patrimonio | `netWorth` | |
| Activo | `asset` | |
| Tipo de activo | `assetType` / `asset_type` | liquido, inmueble, vehiculo, otro |
| Saldo líquido | `liquidAssets` | Cuentas, bolsillos y efectivo (`Patrimonio!C33`) |
| Concentración | `concentration` | Inmuebles y vehículos sobre activos |
| Patrimonio neto | `netWorth` | Activos, inversiones y por cobrar menos deudas (`Patrimonio!F30`) |
| Grupo de la composición del patrimonio | `NetWorthGroup` | liquido, inversion, inmueble, vehiculo, por_cobrar, otro |
| Inversión | `investment` | |
| Inversiones actuales | `investments` / `currentInvestments` | Plataforma o tipo, sin número de cuenta |
| Tramo (de una inversión) | `bucket` / `InvestmentBucket` | crecimiento, estabilidad; sin tramo cuenta solo en el total |
| Perfil de riesgo | `riskProfile` / `risk_profile` | |
| Nivel de riesgo | `RiskLevel` | no_invertir, conservador, moderado, tolerante |
| Si su inversión bajara 15 % | `dropReaction` / `drop_reaction` | venderia, esperaria, invertiria_mas |
| Experiencia invirtiendo | `experience` | ninguna, algo, bastante |
| Plazo en que podría necesitar el dinero | `horizon` / `MoneyHorizon` | menos_3, de_3_a_7, mas_7 |
| Condiciones de capacidad | `RiskCapacityInput` | variableIncome, dependentsWithoutLifeInsurance, pensionGap (siempre falso, ADR 0016), emergencyFundIncomplete, nearRetirementWithoutPension (menos de 5 años para el retiro) |
| Perfil final | `final` / `finalLevel` | El menor entre disposición y capacidad |
| Disposición | `riskWillingness` | Lo que quiere asumir |
| Capacidad | `riskCapacity` | Lo que puede asumir |
| Crecimiento, estabilidad | `growth`, `stability` | |
| Posición en el rango | `rangePosition` | |
| Proyección ilustrativa | `projection` | |
| Distribución de la inversión | `investmentPlan` | Mensual, anual, aporte único, objetivo y movimiento sugerido |
| Rango en crecimiento por edad | `growthRanges` / `GrowthRangeBand` | `method.growth_ranges` |
| Edad de retiro esperada | `retirementAge` / `retirement_age` | Por defecto, `method.retirement_age_by_sex` (supuesto, B16) |
| Rendimiento real supuesto | `realReturnGrowth`, `realReturnStability` | Ilustrativo, no garantizado |
| Bajada cerca del retiro, piso | `glideStep`, `growthFloor` | `Supuestos!C30:C31` |
| Inversión, metas, seguros (rutas) | `/inversion`, `/inversion/perfil`, `/inversion/supuestos`, `/metas`, `/seguros`, `/seguros/supuestos` | Dentro de `/clientes/[id]`; las del cliente en `/mis-datos` sin los supuestos |
| Escribir los supuestos del caso | `writeCaseSettings` | `server/case-settings.ts` |
| Pensión | `pension` | Solo como tipo de ingreso y tipo de cliente; la plataforma no la analiza (ADR 0016) |
| Brecha pensional | `pensionGap` | Condición de capacidad de la plantilla; siempre falsa (ADR 0016) |
| Resumen | `summary` | |
| Semáforo: bien, atención, alerta | `ok`, `warning`, `alert` | |
| Pendientes | `pendingItems` | |
| Control mensual | `monthlyControl` / `monthly_control_entries` | Gasto real por categoría y mes (RN-133); `/control-mensual` y `/clientes/[id]/control-mensual` |
| Gasto real registrado | `MonthlyControlEntry` | Un registro por categoría y mes; 0 es un mes sin gasto |
| Desviación, por encima, por debajo | `deviation`, `over`, `under` | (real − presupuesto) / presupuesto; se marca si pasa de `MONTHLY_CONTROL_THRESHOLD` (10 %) |
| Plan de acción | `actionPlan` | `/tareas` (P-C09) y `/clientes/[id]/plan-de-accion` |
| Tarea | `actionItem` / `action_items` | |
| Tarea sugerida | `suggestedActions`, `ACTION_TEMPLATES`, `suggestion_key` | Las 14 de la plantilla; en modo nativo, solo las que aplican (ADR 0018) |
| Prioridad, responsable, estado de una tarea | `priority`, `owner_role`, `status` | alta, media, baja; cliente, asesor, contador, abogado, aseguradora, administradora_pensiones ("Entidad de pensiones"); pendiente, en_curso, hecho |
| Tarea vencida | `isOverdue` | Fecha límite anterior a hoy y sin hacer |
| Notas para el cliente | `notas` (`client_documents.kind`), `NOTES_SECTIONS` | Se publican aparte (`status` publicado, `published_at`); `/clientes/[id]/notas` |
| Carta de cierre | `carta` (`client_documents.kind`), `LETTER_SECTIONS` | Partes de la sección 11 del protocolo; va con el plan entregado; `/clientes/[id]/carta` |
| Marcador de cifra | `FIGURE_MARKERS`, `figureMarker`, `fillFigures` | `{{sobrante_anual}}` en el texto; se cambia por el valor escrito (ADR 0019) |
| Insertar cifra, ver como el cliente | `insertableFigures`, `DocumentEditor` | P-A13 |
| PDF del plan entregado | `renderLetterPdf`, `deliveryPdfResponse` | `/mi-plan/pdf` y `/clientes/[id]/planes/[deliveryId]/pdf`; se genera al pedirlo (ADR 0020) |
| Documentos entregados | `plan_deliveries.documents`, `DeliveredDocuments` | Carta y notas publicadas con las cifras fijas del día de la entrega |
| Seguimiento | `followUp` | P-A16, `/clientes/[id]/seguimiento` (ADR 0021) |
| Revisión a 30 días, a 90 días, anual | `review_30_days`, `review_90_days`, `annual_review` (`REVIEW_KEYS`) | Tareas sugeridas del plan de acción; `reviews`, `nextReview` |
| Próxima revisión | `nextReview` | La revisión sin hacer con la fecha más temprana, aunque esté vencida |
| Programar las revisiones | `scheduleReviews` | Agrega las que faltan, con la fecha desde la fecha de corte |
| Ficha de continuidad | `continuitySheet`, `continuityText` | Anexo C del protocolo; se arma al verla con los datos de hoy |
| Sucesión y decisiones | `continuity_notes` / `ContinuityNotes` | Testamento (`has_will`), beneficiarios revisados (`beneficiaries_reviewed`) y decisiones tomadas (`decisions`); null es "sin dato"; `/clientes/[id]/seguimiento/ficha` |
| Plan entregado | `planDelivery` | Versión fija |
| Cifras clave | `keyFigures` | |
| Antes y después | `changeImpact` / `change_impacts` | Registro de los cambios que movieron cifras clave |
| Registrar el antes y después | `withImpact`, `record_change_impact` | Envoltura de cada guardado y función de Postgres que escribe el registro |
| Caché de cifras clave | `client_key_figures` | Las últimas cifras calculadas de cada cliente |
| Cálculo del caso | `compute` / `CaseInput`, `CaseResult` | Función pública del motor |
| Diferencias de cifras clave | `diffKeyFigures` / `KeyFigureDelta` | |
| Cambio del cliente | `cambio_del_cliente` | Tipo de aviso al asesor |
| Mis datos | `/mis-datos` | P-C06 |
| Mis gastos | `/mis-datos/gastos` | P-C06 y P-C07 |
| Mis ingresos, monedas | `/mis-datos/ingresos`, `/mis-datos/monedas` | |
| Perfil y supuestos | `/clientes/[id]/perfil` / `ProfileScreen` | P-A04 bloque A y P-A05 |
| Monedas del cliente | `/clientes/[id]/monedas` / `CurrenciesScreen`, `saveFxRate` | P-A19 |
| Meses de fondo sugeridos | `method.emergency_months_by_client_type` | Parámetro común de la metodología (RN-004) |
| Vista previa del impacto | `ImpactPreview`, `usePreviewFigures` / `PreviewCase` | "Así cambia tu plan" |
| Avisar al salir sin guardar | `useUnsavedWarning` | |
| Importe con más decimales | `parseDecimal` | Tasas de cambio, hasta 8 decimales |
| Quien edita los datos del cliente | `requireCaseEditor` / `CaseEditor` | Asesor (RLS decide) o dueño del perfil |
| Umbrales fiscales que aplican | `fiscal_threshold_keys` | Columna de `case_settings`; sin uso en la app desde el 09/10/2026 |
| Importe escrito | `parseAmount`, `amountToText` | Punto de miles y coma decimal |
| Historial de cambios | `auditLog` | |
| Control de calidad | `qualityChecks` | |
| Modo compatible, modo nativo | `compatible`, `native` | Opción del motor |
| Idioma de la interfaz | `Language` (`es`, `en`), `LANGUAGES`, `getLanguage` | ADR 0022; se elige con `LanguageSwitcher` (`setLanguage`, cookie `miluca-lang`) o sale de `Accept-Language` (`negotiateLanguage`) |
| Tema elegido | `ThemePreference` (`system`, `light`, `dark`), `THEME_PREFERENCES`, `getThemePreference` | ADR 0033; "Automático" es `system`. Se elige con `ThemeSwitcher` (`setTheme`, cookie `miluca-theme`) y se pinta en `<html data-theme>` |
| Hoja de los temas | `themeStylesheet`, `themeAttribute`, `themeColors` | `packages/ui/src/theme.ts`: variables `--ml-*` y `color-scheme` de cada tema; `theme-color` de la barra del navegador |
| Cambio del tema al tocar | `applyTheme` | Cambia `data-theme` sin esperar al servidor y sin transiciones |
| Preferencias de la interfaz | `InterfacePreferences`, `PreferenceForm`, `PreferenceOption` | Idioma y tema juntos en cada pantalla; formulario con acción de servidor y botones con `aria-pressed` |
| Textos en el idioma de la petición | `getMessages`, `pageMetadata`, `pageTitle` | `src/server/i18n.ts`; títulos de página con `generateMetadata` |
| Textos para quien lee | `messagesFor`, `MessagesAudience` (`address`, `country`) | Capas `USTED_MESSAGES` (`es-usted.json`) y `COUNTRY_MESSAGES` (`es-ES.json`) sobre `es.json` |
| Propuesta del asesor | `proposals` / `ProposalRow`, `Proposals` | ADR 0024; una en borrador por cliente, aplicada queda fija |
| Ajuste de la propuesta | `proposal_adjustments` / `AdjustmentRow`, `ScenarioAdjustment`; `kind` (`ajustar`, `quitar`) | Cambia el valor por pago de un gasto o lo quita |
| Porqué del ajuste | `reason` | Va como nota de la tarea al aplicar |
| Decisión del cliente | `decision` (`pendiente`, `aceptado`, `descartado`) | La anota el asesor en la sesión; lo pendiente pasa a una propuesta nueva al aplicar |
| Aplicar la propuesta | `apply_proposal` / `applyProposal` | Pasa lo aceptado al presupuesto y crea las tareas, en una transacción |
| Plan con la propuesta | `rowsWithProposal`, `computeProposal`, `compareProposal` | Las filas del cliente con los ajustes, calculadas por el motor sin guardar |
| Cambio del gasto al mes | `monthlyChange` | Lo que cambia el propio gasto con su ajuste, en moneda base |
| Textos sin persona | `getBaseMessages` | Solo el idioma: layout raíz, títulos de página y lo que solo ve el asesor |
| Textos del caso | `getCaseMessages` | Con el país del cliente aunque los pida el asesor: carta, tareas sugeridas, PDF |
| Diferencia en dinero de la prueba de realidad | `gapMonthly` | Real menos esperado, al mes; se muestra si el esperado es 0 o menos |
| Locale de presentación | `displayLocale`, `getLocale` | Idioma más región del país (`en-CO`); fechas en el idioma |
| Formato numérico del país | `numberLocale` | Importes y porcentajes iguales en los dos idiomas |
| Nombre del país en el idioma | `countryLabel` | `Intl.DisplayNames` fuera del español |
| Categoría canónica | `canonicalCategory`, `categoryLabel`, `BUDGET_CATEGORIES`, `AUTOMATIC_CATEGORIES` | Se guarda en español; se muestra en el idioma de quien mira |
| Nombres del catálogo en otro idioma | `CONCEPT_NAMES_EN`, `catalogConceptNames`, `catalogPocketNames` | `packages/i18n/src/budget-catalog/en.ts` |
| Idioma de respuesta del agente | `<idioma_de_respuesta>` | Etiqueta de cada mensaje al agente de captura |
| Pantalla de resumen | `WideScreen` | ADR 0023; formularios y lectura con `Screen` |
| Lista en rejilla | `gridList`, `gridListItem` | Recuadro con divisores en el celular, tarjetas desde la tableta |
| Landing | `LandingPage`, `features/landing`, grupo de textos `landing` | P-G06; la raíz sin sesión (ADR 0026) |
| Inicio del cliente | `ClientHome`, `features/client-home` | P-C04; la raíz con sesión de cliente |
| Privacidad pública | `/privacidad`, `PublicPrivacyPage`, grupo de textos `publicPrivacy` | P-G07; los avisos vigentes sin sesión. La de la app es `/privacidad-y-datos` |
| Cabecera y pie públicos | `PublicHeader`, `PublicFooter`, `SkipLink` | Compartidos por el landing y la privacidad pública |
| Sección pública | `LandingSection` (`tone`: `plain`, `tinted`), `SectionTitle`, `SectionIntro` | En el escritorio, título a la izquierda y contenido a la derecha |
| Columna de las páginas públicas | `pageColumn`, `readingWidth` | Mismo borde izquierdo en cabecera, secciones y pie |
| Número de WhatsApp del landing | `CONTACT_WHATSAPP`, `whatsappNumber`, `configuredWhatsappNumber` | Variable de entorno, no va en el repositorio |
| Enlace de contacto | `contactLink`, `ContactLink` (`whatsapp`, `email`), `CONTACT_EMAIL` | WhatsApp con el mensaje escrito o, sin número, el correo del responsable |
| Botones de contacto | `WriteMeButton`, `FirstSessionButton` | Escríbeme por WhatsApp y Pedir una primera conversación |
| Perfil del asesor | `ADVISOR`, `AdvisorProfile` | Nombre y foto de "Sobre mí" |
| Capturas del landing | `STAGE_SCREENS`, `screenshotSrc`, `SCREENSHOT_SIZE`, `PhoneFrame` | WebP de `tools/landing-screenshots` en `public/landing/`, junto a su etapa |
| URL pública | `siteUrl` | Dominio de producción de Vercel; base de los metadatos, `robots.txt` y `sitemap.xml` |
| Colores de la marca | `brand`, `on-brand`, `accent`, `on-accent`; `palette.brandNavy`, `palette.brandOrange` | Solo en las páginas públicas (`tokens.md`, sección 5) |
| Botones de la marca | `brandButton`, `brandSecondaryButton` | `ui-classes.ts`; solo en las páginas públicas |
| Caso inventado de las capturas | `prepareCase`, `fictitious-case.ts` | Solo en Supabase local; nunca datos de clientes |
| Etapas del landing, confianza | `StagesSection`, `TrustSection` | "Tres etapas, un reporte claro en cada una" y "Primero tu tranquilidad, y tus datos protegidos" |
| Barra de contacto fija | `StickyContact`, `data-sticky-contact` | Solo en el celular; entra al dejar atrás la presentación |
| Moneda y ranura de la marca | `CoinSlot` | Bajo el título del landing; la moneda cae al cargar |
| Movimiento del landing | `motion.module.css` (`slot`, `coin`, `reveal`, `pop`, `draw`, `stickyIn`) | Solo CSS; nada con "reducir movimiento" |
