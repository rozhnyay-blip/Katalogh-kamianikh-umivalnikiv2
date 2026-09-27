export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <path className="brand-stone" d="M5.2 24.8 8.9 13.5 16.2 6.8 27.9 7.8 35.1 16.5 33 27.9 24.9 34 11 31.4Z" />
          <path className="brand-stone-facet" d="m8.9 13.5 10.9 3.6 8.1-9.3M19.8 17.1 11 31.4m8.8-14.3 13.2 11.1M19.8 17.1 24.9 34" />
          <path className="brand-stone-vein" d="m12.3 11.5 4.1-3.7" />
        </svg>
      </span>
      <span>
        <span className="brand-word">SKALA</span>
        <span className="brand-sub">prírodný kameň</span>
      </span>
    </div>
  );
}
