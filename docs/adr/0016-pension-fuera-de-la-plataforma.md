# 0016. La pensión queda fuera de la plataforma

- Estado: Aceptada (decisión del responsable)
- Fecha: 2026-10-04

## Contexto

El plan preveía la fase F6, "Pensión por país": el módulo de Colombia (semanas, requisito por año, mesada por escenarios, flujo después de pensionarse y brecha pensional, hoja Pensión de la plantilla y `Resumen!C29:C32`), un módulo informativo para España y una marca por cliente para activarlo (`case_settings.pension_enabled`, apagada por defecto). Hasta F5 solo existían la marca, el interruptor en el perfil y el módulo por país (`countries.pension_module`); el motor no calculaba nada de pensión.

El 04/10/2026 el responsable decidió no incorporar la pensión a la plataforma.

## Decisión

- F6 se elimina del plan de trabajo. La plataforma no estima semanas, mesadas ni brecha pensional en ningún país.
- Se quitan `case_settings.pension_enabled`, `countries.pension_module` y el interruptor "Analizar la pensión de este cliente" del perfil (migración `remove_pension`). El historial conserva los valores anteriores tal como se registraron.
- El perfil de riesgo se calcula como la plantilla con la hoja Pensión vacía: la condición "brecha pensional" (`Inversión!C27`) es siempre "No" y ninguna pensión cuenta como asegurada, así que "menos de 5 años para el retiro" (`Inversión!C29`) depende solo de la edad. Las pantallas no muestran la brecha pensional. No cambia ningún resultado del motor ni las pruebas de oro.
- Lo que no es el módulo de pensión sigue igual: los ingresos tipo pensión (un cliente pensionado), el tipo de cliente "pensionado", los aportes de seguridad social del presupuesto y la edad de retiro esperada de la proyección de inversión.
- Los temas de pensión se remiten a la administradora de pensiones (Colombia) o a la Seguridad Social (España), como dice la regla 11 de `CLAUDE.md`.

## Consecuencias

- El plan baja 80 horas: F7 y F8 se adelantan y el total queda en 1.196 horas con margen. El hito de paridad de cálculo (M3) es "todo lo que calcula la plantilla salvo la hoja Pensión".
- La edad de retiro por defecto ya no puede salir de los parámetros de pensión de cada país: queda el supuesto de la plantilla (57 o 62 años según el sexo) y el asesor escribe la de cada cliente (B16).
- B10 (parámetros de pensión de Colombia), H-08 y H-19 dejan de aplicar. RN-120 a RN-122 quedan fuera del alcance.
- El aviso de estimación de pensión de `docs/legal/README.md` no se usa. Los avisos de tratamiento de datos 1.0 y 1.1 ya aprobados no se cambian por esto; si mencionan datos de pensión, se revisa en su próxima versión.
- El salario mínimo de Colombia (`minimum_wage`) solo lo usaba la hoja Pensión; queda publicado por si otro módulo lo necesita.

## Alternativas consideradas

- Dejar la marca y el interruptor sin módulo detrás: muestran una opción que no hace nada.
- Mantener solo el módulo informativo de España: sigue siendo un tema regulado que el responsable prefiere remitir al profesional.
