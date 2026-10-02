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
| País | `country` | Catálogo `countries` con moneda, formato y módulo de pensión |
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
| Buscar clientes | `?q=`, `parseSearch` | P-A01 |
| Recuperar contraseña | `/recuperar`, `recoverPassword` | P-G05; pasos `email`, `code`, `password` |
| Aviso | `notification` / `Notice` | Fila de `notifications`; tipo `invitacion_aceptada` |
| Marcar como visto | `markNoticeRead`, `read_at` | |
| Generar la migración de textos legales | `tools/legal-texts/build_migration.py` | Desde `docs/legal/textos/` |
| Pantalla solo del cliente | `requireClient` | Guarda de `src/server/viewer.ts`; otro rol va a su inicio |
| Trato | `form_of_address` / `FormOfAddress` (`tu`, `usted`) | Los textos del cliente vienen en las dos variantes y se eligen con `withAddress` |
| Entrar (iniciar sesión) | `signIn` | Pantalla P-G01, ruta `/entrar` |
| Cerrar sesión | `signOut` | Solo en el dispositivo actual (`scope: 'local'`) |
| Sesión | `session` | Usuario de la sesión: `SessionUser` |
| Ruta de retorno | `next` | Ruta interna a la que se vuelve después de entrar; se valida con `safeNextPath` |
| Fecha de corte | `cutoffDate` | Fecha a la que se refieren los cálculos |
| Fecha | `IsoDate` | Texto "AAAA-MM-DD", sin hora ni zona |
| Meses completos entre fechas | `datedifMonths` | `DATEDIF(inicio, fin, "m")` de Excel |
| Año del flujo | `flowYear` | |
| Tipo de cliente | `clientType` | empleado, contratista, independiente_variable, pensionado, rentista, mixto |
| Supuestos del caso | `caseSettings` | Criterio del asesor |
| Parámetros por país | `countryParameters` | Versionados, con fuente |
| Moneda base | `baseCurrency` | |
| Tasa de cambio | `fxRate` | Unidades de moneda base por una unidad extranjera |
| Tasas del cliente | `clientFxRates` | Una por moneda distinta de la base, con fecha |
| Selector de moneda | `CurrencySelect` | Componente de `packages/ui` junto a cada campo de dinero |
| Importe con moneda | `Money` | `{ amount, currency }` |
| Ingreso | `income` | Tipos (`incomeKind`): laboral, renta, pension, otro |
| Pagos por mes | `paymentsByMonth` / `MonthFlags` | Doce marcas, de enero a diciembre |
| Meses con seguridad social | `socialSecurityPayments` | `Ingresos!S17` |
| Ingreso base (variable) | `baseIncome` / `variable_income_history` | Calculadora en `/ingresos/ingreso-base` |
| Va todo a ahorro | `allocation = 'ahorro_total'` | RN-014 |
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
| Costo de vida | `costOfLiving` | |
| Nivel esencial, básico, actual | `CostLevel`: `essential`, `basic`, `current` | Niveles del costo de vida |
| Valor del nivel básico | `basicAmount` / `basic_amount` | Valor por pago, con la frecuencia y la moneda de la partida; lo propone el asesor |
| Umbral fiscal | `FiscalThreshold` | Parámetro del país; cuáles aplican se decide por cliente |
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
| Totales de deudas | `debtTotals` | Saldo y cuotas mínimas (`Deudas!D21`, `F21`) |
| Abono extra | `extraPayment` | |
| Avalancha, bola de nieve, orden manual | `avalancha`, `bola_de_nieve`, `manual` | Valores de catálogo |
| Carga de deuda | `debtLoad` | Cuotas / ingreso mensual |
| Crédito (seguimiento) | `credit` | Plantilla de créditos |
| Cuota | `installment` | |
| Subsidio FRECH | `frechSubsidy` | Cobertura de tasa del gobierno de Colombia |
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
| Primas de seguros nuevos | `newPremiumsAnnual` | `Seguros!H16` |
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
| Analizar la pensión de este cliente | `pension_enabled` / `pensionEnabled` | Apagado por defecto; lo activa el asesor (RN-120) |
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
| Umbrales fiscales que aplican | `fiscal_threshold_keys` | Columna de `case_settings` |
| Importe escrito | `parseAmount`, `amountToText` | Punto de miles y coma decimal |
| Historial de cambios | `auditLog` | |
| Control de calidad | `qualityChecks` | |
| Modo compatible, modo nativo | `compatible`, `native` | Opción del motor |
