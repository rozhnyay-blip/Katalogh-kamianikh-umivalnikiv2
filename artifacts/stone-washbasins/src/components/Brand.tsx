export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <path className="brand-stone" d="M7.3 23.7c-1.2-2.8.9-5.4 1.8-8.4.8-2.9 3.4-4.2 6.1-6.1 2.2-2.6 5.2-2 8.1-1.1 3.3-1.3 6 .7 7.5 3.3 3.3.8 4.2 3.6 3.5 6.8 1.9 3 .1 5.7-1.7 7.9.2 3.2-2.6 5.2-5.6 5.8-2.4 2.4-5.4 1.2-7.9.6-2.9 1-5.9-.7-7.7-2.6-3.1-.5-4.3-3-4.1-6.2Z" />
          <path className="brand-stone-strata" d="M11 18.2c2.8-1.1 5.2-.9 7.9-.1 2.7.8 5.2 1.3 8.9-.2M10.4 23.6c3.2-1.2 5.8-.7 8.8.2 2.6.8 4.7.7 7.4-.1M13.2 28.4c2.6-.8 4.4-.6 6.7.1 1.7.5 3.2.4 4.8 0" />
          <path className="brand-stone-vein" d="M15 13.6c1.5-1.1 3.2-1.4 4.7-1.1" />
        </svg>
      </span>
      <span>
        <span className="brand-word">SKALA</span>
        <span className="brand-sub">prírodný kameň</span>
      </span>
    </div>
  );
}
