# packages/i18n

Textos de la interfaz por idioma (`messages/es.json` primero) y formateadores por país: moneda, números, fechas y porcentajes.

## Catálogo de conceptos del presupuesto

`src/budget-catalog/` tiene, por país, los conceptos típicos del presupuesto con la frecuencia, el tipo, el bolsillo y el esencial que sugiere la plantilla (`budgetCatalog(país)`). Para habilitar un país nuevo se agrega su archivo con la misma estructura y una línea en `BUDGET_CATALOGS`; la prueba exige un catálogo por cada país de `COUNTRY_LOCALES` y que todo quepa en las columnas de la base.

## Responsabilidad

Que ninguna pantalla ni exportación tenga textos o formatos escritos a mano. El país y la moneda del cliente deciden el formato (por ejemplo, 1.750.905 COP o 1.750,90 EUR); el idioma del usuario decide los textos.
