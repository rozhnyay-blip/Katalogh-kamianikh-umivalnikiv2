export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <path className="brand-stone" d="M7.3 23.7c-1.2-2.8.9-5.4 1.8-8.4.8-2.9 3.4-4.2 6.1-6.1 2.2-2.6 5.2-2 8.1-1.1 3.3-1.3 6 .7 7.5 3.3 3.3.8 4.2 3.6 3.5 6.8 1.9 3 .1 5.7-1.7 7.9.2 3.2-2.6 5.2-5.6 5.8-2.4 2.4-5.4 1.2-7.9.6-2.9 1-5.9-.7-7.7-2.6-3.1-.5-4.3-3-4.1-6.2Z" />
          <path className="brand-stone-veins" d="M10.3 29.4c2.2-3 2.2-5.3 4.7-7.2 3.2-2.4 3.6-3.7 3.1-6.3-.5-2.5 1.6-4.1 4.4-6.3M12.5 29.8c2.3-2.3 2.8-4.8 5-6.6 2.8-2.3 4.7-3 4.6-5.6m-6 4.6c-1.3-.1-2.4-.8-3.2-2.1m7.5-4.3c1.7.2 3.1.8 4.6 2.3m-2.1-5.9c1.3-.2 2.5.1 3.5 1.1" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-word">SKALA</span>
        <span className="brand-sub">prírodný kameň</span>
      </span>
    </div>
  );
}
