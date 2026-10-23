import type { MouseEventHandler } from 'react';

export function Brand({ onClick, inverse = false }: { onClick?: MouseEventHandler<HTMLButtonElement>; inverse?: boolean }) {
  return (
    <button className={`brand ${inverse ? 'brand-inverse' : ''}`} onClick={onClick} type="button" aria-label="Pencilly home">
      pencilly<span>.</span><span className="brand-dash" aria-hidden="true" />
    </button>
  );
}
