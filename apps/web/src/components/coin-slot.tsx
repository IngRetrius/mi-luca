import motion from './coin-slot.module.css';

/**
 * La ranura de la alcancía y la moneda encima, como en el logo. Al cargar, la ranura se abre y la
 * moneda cae (`coin-slot.module.css`); sin movimiento, quedan quietas. Es decorativa.
 */
export function CoinSlot({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative block h-6 w-14 ${className}`}>
      <span
        className={`absolute top-0 left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent ${motion.coin}`}
      />
      <span className={`absolute inset-x-0 bottom-0 h-1.5 rounded-full bg-accent ${motion.slot}`} />
    </span>
  );
}
