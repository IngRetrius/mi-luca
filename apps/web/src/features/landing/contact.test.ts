import { describe, expect, it } from 'vitest';

import { CONTACT_EMAIL, contactLink, whatsappNumber } from './contact';

describe('whatsappNumber', () => {
  it.each([
    ['+57 300 000 0000', '573000000000'],
    ['+573000000000', '573000000000'],
    ['573000000000', '573000000000'],
    ['+34 (600) 00-00-00', '34600000000'],
    ['  +57.300.000.0000  ', '573000000000'],
  ])('%s → %s', (value, expected) => {
    expect(whatsappNumber(value)).toBe(expected);
  });

  it.each([
    ['vacío', ''],
    ['sin definir', undefined],
    ['sin indicativo, demasiado corto', '3000000'],
    ['empieza por cero', '0573000000000'],
    ['más de 15 dígitos', '+5730000000001234'],
    ['con letras', '+57 300 ABC 0000'],
    ['un "+" en medio', '57+3000000000'],
    ['una URL', 'https://wa.me/573000000000'],
  ])('rechaza %s', (_label, value) => {
    expect(whatsappNumber(value)).toBeNull();
  });
});

describe('contactLink', () => {
  const message = 'Hola, vi la página de MiLuca y quiero saber más.';

  it('con número, abre WhatsApp con el mensaje codificado', () => {
    const link = contactLink(message, '573000000000');
    expect(link.channel).toBe('whatsapp');
    expect(link.href).toBe(
      'https://wa.me/573000000000?text=Hola%2C%20vi%20la%20p%C3%A1gina%20de%20MiLuca%20y%20quiero%20saber%20m%C3%A1s.',
    );
    expect(decodeURIComponent(new URL(link.href).searchParams.get('text') ?? '')).toBe(message);
  });

  it('sin número, abre el correo de contacto con el mensaje como asunto', () => {
    const link = contactLink(message, null);
    expect(link.channel).toBe('email');
    expect(link.href.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    expect(decodeURIComponent(link.href.split('subject=')[1] ?? '')).toBe(message);
  });

  it('un "&" o un "#" del mensaje no corta el enlace', () => {
    const { href } = contactLink('Deudas & metas #1', '573000000000');
    expect(new URL(href).searchParams.get('text')).toBe('Deudas & metas #1');
  });
});
