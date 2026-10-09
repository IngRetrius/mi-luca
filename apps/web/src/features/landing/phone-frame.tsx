import Image from 'next/image';

import { SCREENSHOT_SIZE } from './screenshots';

/**
 * Captura de la app dentro de un marco de teléfono hecho con borde y radio, sin imágenes extra. La
 * captura ya viene en WebP a doble densidad (`screenshots.ts`): se sirve tal cual y se carga al
 * acercarse; el ancho y el alto reservan su lugar para que la página no salte. También la de la
 * presentación, que solo se ve en el escritorio: así el celular no la descarga.
 */
export function PhoneFrame({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`rounded-4xl border border-border bg-surface p-2 ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={SCREENSHOT_SIZE.width}
        height={SCREENSHOT_SIZE.height}
        unoptimized
        className="h-auto w-full rounded-3xl border border-border bg-bg"
      />
    </div>
  );
}
