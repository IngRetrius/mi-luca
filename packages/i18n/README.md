# packages/i18n

Textos de la interfaz por idioma (`messages/es.json` y `messages/en.json`, con las mismas claves; ADR 0022) y formateadores por país: moneda, números, fechas y porcentajes.

## Idiomas

`languages.ts` define los idiomas (`LANGUAGES`), la cookie del selector (`LANGUAGE_COOKIE`) y la negociación con `Accept-Language`. `displayLocale(país, idioma)` da el locale de presentación (`en-CO`): las fechas salen en el idioma y `formatMoney`, `formatPercent` y los campos numéricos usan siempre el formato del país (`numberLocale`). `categories.ts` guarda las categorías del presupuesto con su valor canónico en español (`canonicalCategory`) y las muestra en el idioma de la pantalla (`categoryLabel`). Las pruebas exigen las mismas claves y marcadores en los dos archivos.

`messagesFor(idioma, { address, country })` da los textos para quien lee: `messages/es-usted.json` tiene la versión en usted de lo que no tiene variantes `{ tu, usted }` (los errores de los formularios, algunas ayudas y los avisos comunes) y `messages/es-ES.json` el vocabulario de España donde difiere de la base de Colombia. Las dos son capas con solo los textos que cambian; las pruebas exigen que cada texto exista en `es.json` con los mismos marcadores, que ninguno esté en las dos capas y que todo error en tú que ve el cliente tenga su versión en usted.

## Catálogo de conceptos del presupuesto

`src/budget-catalog/` tiene, por país, los conceptos típicos del presupuesto con la frecuencia, el tipo, el bolsillo y el esencial que sugiere la plantilla (`budgetCatalog(país)`). Para habilitar un país nuevo se agrega su archivo con la misma estructura, sus nombres en inglés en `en.ts` y una línea en `BUDGET_CATALOGS`; la prueba exige un catálogo por cada país de `COUNTRY_LOCALES` y que todo quepa en las columnas de la base.

## Responsabilidad

Que ninguna pantalla ni exportación tenga textos o formatos escritos a mano. El país y la moneda del cliente deciden el formato de las cifras (por ejemplo, 1.750.905 COP o 1.750,90 EUR, en español y en inglés); el idioma del usuario decide los textos y las fechas.
