import type { Messages } from '@miluca/i18n';

/**
 * Textos de acceso. Los componentes de cliente los reciben por props desde el servidor, en lugar de
 * importar el catálogo completo de mensajes, que terminaría entero en el paquete del navegador.
 */
export type AuthText = Messages['auth'];
