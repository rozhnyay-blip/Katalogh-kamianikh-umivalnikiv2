export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true" />
      <span>
        <span className="brand-word">SKALA</span>
        <span className="brand-sub">prírodný kameň</span>
      </span>
    </div>
  );
}
