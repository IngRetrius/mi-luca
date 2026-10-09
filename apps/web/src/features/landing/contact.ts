/**
 * Contacto desde las páginas públicas (ADR 0026): WhatsApp si hay número configurado y, si no, el
 * correo del responsable. La página no guarda nada: cada botón abre la conversación con un mensaje
 * propio, escrito pero sin enviar, para que el asesor sepa de qué botón vino [F65].
 */

/** Correo de contacto del responsable, el mismo de los avisos de privacidad (decisión A7b). */
export const CONTACT_EMAIL = 'retrius2001@gmail.com';

/** Solo dígitos, espacios, paréntesis, puntos, guiones y un "+" inicial. */
const PHONE_SHAPE = /^\+?[\d\s().-]+$/;
/** Número completo en formato internacional (E.164): indicativo sin ceros delante, 8 a 15 dígitos. */
const E164_DIGITS = /^[1-9]\d{7,14}$/;

/**
 * El número como lo pide el enlace de WhatsApp: solo dígitos, con el indicativo del país y sin "+",
 * ceros, paréntesis ni guiones [F65]. Null si falta o no es un número completo.
 */
export function whatsappNumber(value: string | undefined): string | null {
  if (!value || !PHONE_SHAPE.test(value.trim())) return null;
  const digits = value.replace(/\D/g, '');
  return E164_DIGITS.test(digits) ? digits : null;
}

export type ContactChannel = 'whatsapp' | 'email';

export interface ContactLink {
  readonly channel: ContactChannel;
  readonly href: string;
}

/**
 * Enlace que abre la conversación con el mensaje ya escrito: WhatsApp con el número dado o, sin
 * número válido, el correo de contacto con el mensaje como asunto.
 */
export function contactLink(message: string, number: string | null): ContactLink {
  const text = encodeURIComponent(message);
  return number
    ? { channel: 'whatsapp', href: `https://wa.me/${number}?text=${text}` }
    : { channel: 'email', href: `mailto:${CONTACT_EMAIL}?subject=${text}` };
}

/**
 * Número de WhatsApp de la variable `CONTACT_WHATSAPP` (Vercel y `.env.local`). No vive en el
 * repositorio, que es público; se lee en el servidor en cada petición y nunca hace falta en el
 * navegador más allá del enlace.
 */
export function configuredWhatsappNumber(): string | null {
  return whatsappNumber(process.env.CONTACT_WHATSAPP);
}
