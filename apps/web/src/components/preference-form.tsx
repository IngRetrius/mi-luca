import { useId, type ComponentProps, type ReactNode } from 'react';

import { textButton } from './ui-classes';

/**
 * Preferencia de la interfaz que se elige con un toque, como el idioma o el tema: un rótulo y un
 * botón por opción (`PreferenceOption`). La acción es de servidor, así que funciona también sin
 * JavaScript. Si no cabe en una línea (320 px con el texto agrandado), las opciones bajan juntas y
 * no una sola.
 */
export function PreferenceForm({
  action,
  label,
  className = '',
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <form
      action={action}
      role="group"
      aria-labelledby={labelId}
      className={`flex flex-wrap items-center gap-x-1 text-sm ${className}`}
    >
      <span id={labelId} className="text-text-muted">
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-x-1">{children}</span>
    </form>
  );
}

type PreferenceOptionProps = Omit<ComponentProps<'button'>, 'type' | 'aria-pressed'> & {
  name: string;
  value: string;
  selected: boolean;
};

/**
 * Una opción de `PreferenceForm`: envía su valor. La elegida se anuncia como pulsada y se ve en
 * negrita, con el color del texto y sin subrayado: no depende solo del color.
 */
export function PreferenceOption({ selected, className = '', ...props }: PreferenceOptionProps) {
  return (
    <button
      type="submit"
      aria-pressed={selected}
      className={`${textButton} aria-pressed:font-semibold aria-pressed:text-text aria-pressed:no-underline ${className}`}
      {...props}
    />
  );
}
