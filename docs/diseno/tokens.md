# Tokens de diseño

Base: **paleta opción 3** de `paleta_colores.txt` (decisión D1). Contrastes calculados con la fórmula de luminancia relativa de WCAG 2.x [F31]. Mínimos: 4,5:1 para texto normal, 3:1 para texto grande y componentes de interfaz.

## 1. Paleta de marca

| Token | Color | Uso | Contraste sobre blanco | Contraste sobre fondo oscuro #11142B |
|---|---|---|---|---|
| `brand-50` | #E3F6F5 | Fondos de superficie (tarjetas, secciones) en modo claro; texto en modo oscuro | 1,12 (no para texto) | 16,20 |
| `brand-200` | #A7E0DB | Rellenos, pistas de barras de progreso, series de gráficos | 1,47 (no para texto) | 12,36 |
| `brand-400` | #5FB0C9 | **Solo decorativo en modo claro**; enlaces y acentos en modo oscuro | 2,46 (no cumple ni para componentes) | 7,37 |
| `brand-600` | #3E6D9C | Enlaces, botones secundarios, iconos activos en modo claro | 5,42 | 3,34 (no para texto) |
| `brand-900` | #2A2F63 | Texto principal, botón primario, barra de navegación en modo claro; superficies en modo oscuro | 12,46 | 1,45 |

Combinaciones de texto aprobadas:

| Texto | Fondo | Contraste |
|---|---|---|
| `brand-900` | Blanco | 12,46 |
| `brand-900` | `brand-50` | 11,14 |
| `brand-600` | Blanco | 5,42 |
| `brand-600` | `brand-50` | 4,85 |
| Blanco | `brand-900` | 12,46 |
| `brand-50` | #11142B | 16,20 |
| `brand-400` | #11142B | 7,37 |
| `brand-200` | `brand-900` | 8,50 |

## 2. Semáforo

Colores fuera de la paleta de marca a propósito, para que un estado nunca se confunda con un color de marca. Siempre con icono y texto (el color no es el único medio [F31]).

| Estado | Modo claro | Contraste sobre blanco | Sobre `brand-50` | Modo oscuro | Contraste sobre #11142B |
|---|---|---|---|---|---|
| Bien (`status-ok`) | #1B7A4A | 5,34 | 4,78 | #4ADE80 | 10,40 |
| Atención (`status-warning`) | #B45309 | 5,02 | 4,49 (usar solo sobre blanco o en negrita de 18,5 px o más) | #FBBF24 | 10,86 |
| Alerta (`status-alert`) | #B42318 | 6,57 | 5,88 | #F87171 | 6,55 |

## 3. Neutros y fondos

| Token | Modo claro | Modo oscuro |
|---|---|---|
| `bg` | #FFFFFF | #11142B (derivado de `brand-900`, **Supuesto**) |
| `surface` | `brand-50` | `brand-900` |
| `text` | `brand-900` | `brand-50` |
| `text-muted` | #4B5070 (**Supuesto**, verificar contraste al implementar) | #B8C2D9 (**Supuesto**) |
| `border` | `brand-200` | #3A4178 (**Supuesto**) |
| `primary` | `brand-900` | `brand-400` |
| `on-primary` | Blanco | #11142B |

## 4. Tipografía, espacio y tacto

| Token | Valor |
|---|---|
| Fuente | Del sistema (`-apple-system`, `system-ui`, Roboto): sin descarga (decisión D4 propuesta) |
| Tamaño base | 16 px (también el mínimo en campos, para que Safari no haga zoom) |
| Escala | 12, 14, 16, 18, 22, 28, 34 px, en `rem` para respetar el tamaño de texto del sistema |
| Cifras | `font-variant-numeric: tabular-nums` en tablas y montos |
| Espaciado | Múltiplos de 4 px |
| Radio | 8 px en campos, 12 px en tarjetas, 16 px en hojas inferiores |
| Objetivo táctil | 44 x 44 px mínimo |
| Áreas seguras | `env(safe-area-inset-*)` en barra superior e inferior |

## 5. El logo frente a la paleta 3

El logo (`docs/diseno/marca/logo.png`, 1254 x 1254 px, fondo transparente) usa dos colores medidos en el archivo: azul marino **#01255D** y naranja **#F0702C**. Son casi los de la **opción 1** de la paleta (#002B5B y #F07B3F), no los de la opción 3 elegida.

| Color del logo | Sobre blanco | Sobre `brand-50` | Sobre #11142B | Uso posible |
|---|---|---|---|---|
| #01255D | 14,75 | 13,18 | 1,23 | Texto y botón primario en modo claro (mejor contraste que `brand-900`) |
| #F0702C | 2,97 | 2,66 | 6,09 | Solo en el logo o como acento grande; no para texto sobre fondos claros |

**Decisión (D1, 28/09/2026):** se mantiene la paleta opción 3 para la interfaz y el logo actual se usa de forma provisional, hasta que el asesor lo actualice. El archivo fuente está en `docs/diseno/marca/logo.png`. Mientras tanto, el naranja del logo no se usa en la interfaz, porque se confundiría con el estado "Atención" del semáforo (#B45309).

## 6. Relación con la plantilla de Excel

La plantilla usa la marca Petróleo y Oro (#0E3B43, #1D6A72, #C8A04A, #E6EFEF, #FFF8E6). La exportación a Excel conserva el significado de los colores de celda (crema = editable, ámbar = por confirmar) aunque cambie la marca (pregunta D2).
