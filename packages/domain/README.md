# packages/domain

Lenguaje común del producto: tipos de TypeScript, esquemas de validación (zod) y catálogos (frecuencias, tipos de gasto, tipos de cliente, métodos de pago de deudas, estados del semáforo).

## Responsabilidad

Definir la forma de los datos de entrada y salida que comparten la aplicación, el motor y los exportadores. No calcula nada y no depende de ningún otro paquete del repositorio.

## Qué va aquí

- Esquemas de entrada del motor (`CaseInput`) y de salida (`CaseResult`).
- Catálogos con sus claves estables en inglés y la referencia a su etiqueta traducible en `packages/i18n`.
- Matriz de permisos por campo (qué edita el cliente y qué solo el asesor), usada por la interfaz para mostrar u ocultar controles. La autorización real la hace la base de datos.
