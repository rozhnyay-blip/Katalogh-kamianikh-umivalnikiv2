import { useGetOwnerAnalytics, getGetOwnerAnalyticsQueryKey, type OwnerAnalytics } from '@workspace/api-client-react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';

const eventLabels: Record<string, string> = {
  favorite_add: 'Pridanie do obľúbených',
  favorite_remove: 'Odstránenie z obľúbených',
  enquiry_started: 'Začatie dopytu',
  enquiry_submitted: 'Odoslaný dopyt',
  hero_whatsapp_click: 'WhatsApp z úvodnej sekcie',
  contact_phone_click: 'Klik na telefón',
  contact_viber_click: 'Klik na Viber',
  contact_whatsapp_click: 'Klik na WhatsApp',
  contact_instagram_click: 'Klik na Instagram',
  catalog_load_more: 'Načítanie ďalších umývadiel',
};

const numberFormat = new Intl.NumberFormat('sk-SK');

function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('sk-SK', options).format(date);
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent = 'teal',
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Activity;
  accent?: 'teal' | 'clay' | 'gold';
}) {
  return (
    <article className={`skala-analytics__metric skala-analytics__metric--${accent}`}>
      <div className="skala-analytics__metric-top">
        <span>{label}</span>
        <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <strong className="skala-analytics__metric-value">{numberFormat.format(value)}</strong>
      <p>{note}</p>
    </article>
  );
}

function ActivityChart({ daily }: { daily: OwnerAnalytics['daily'] }) {
  const width = 720;
  const height = 224;
  const inset = { top: 16, right: 12, bottom: 35, left: 12 };
  const chartWidth = width - inset.left - inset.right;
  const chartHeight = height - inset.top - inset.bottom;
  const maxValue = Math.max(1, ...daily.flatMap((item) => [item.visits, item.uniqueSessions]));
  const points = daily.map((item, index) => {
    const x = inset.left + (daily.length <= 1 ? chartWidth / 2 : (index / (daily.length - 1)) * chartWidth);
    return {
      x,
      visitsY: inset.top + chartHeight - (item.visits / maxValue) * chartHeight,
      sessionsY: inset.top + chartHeight - (item.uniqueSessions / maxValue) * chartHeight,
    };
  });
  const line = (key: 'visitsY' | 'sessionsY') => points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point[key]}`).join(' ');
  const labelIndices = Array.from(new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1]));

  if (daily.length === 0) {
    return <div className="skala-analytics__chart-empty">V tomto období zatiaľ nie sú zaznamenané denné návštevy.</div>;
  }

  return (
    <div className="skala-analytics__chart-wrap">
      <svg
        className="skala-analytics__chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Denný vývoj návštev a anonymných relácií za ${daily.length} dní`}
      >
        {[0, 1, 2].map((row) => {
          const y = inset.top + (chartHeight / 2) * row;
          return <line key={row} x1={inset.left} x2={width - inset.right} y1={y} y2={y} className="skala-analytics__grid-line" />;
        })}
        <path d={`${line('visitsY')} L ${points[points.length - 1].x} ${inset.top + chartHeight} L ${points[0].x} ${inset.top + chartHeight} Z`} className="skala-analytics__area" />
        <path d={line('visitsY')} className="skala-analytics__line skala-analytics__line--visits" />
        <path d={line('sessionsY')} className="skala-analytics__line skala-analytics__line--sessions" />
        {points.map((point, index) => (
          <g key={daily[index].date}>
            <circle cx={point.x} cy={point.visitsY} r="3" className="skala-analytics__point skala-analytics__point--visits">
              <title>{`${formatDate(daily[index].date, { day: 'numeric', month: 'long' })}: ${numberFormat.format(daily[index].visits)} návštev`}</title>
            </circle>
            <circle cx={point.x} cy={point.sessionsY} r="3" className="skala-analytics__point skala-analytics__point--sessions">
              <title>{`${formatDate(daily[index].date, { day: 'numeric', month: 'long' })}: ${numberFormat.format(daily[index].uniqueSessions)} anonymných relácií`}</title>
            </circle>
          </g>
        ))}
        {labelIndices.map((index) => (
          <text key={daily[index].date} x={points[index].x} y={height - 8} textAnchor={index === 0 ? 'start' : index === daily.length - 1 ? 'end' : 'middle'} className="skala-analytics__axis-label">
            {formatDate(daily[index].date)}
          </text>
        ))}
      </svg>
      <div className="skala-analytics__legend" aria-hidden="true">
        <span><i className="skala-analytics__legend-dot skala-analytics__legend-dot--visits" /> Návštevy</span>
        <span><i className="skala-analytics__legend-dot skala-analytics__legend-dot--sessions" /> Anonymné relácie</span>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useGetOwnerAnalytics({
    query: { queryKey: getGetOwnerAnalyticsQueryKey() },
  });

  if (isLoading) {
    return (
      <section className="skala-analytics" aria-label="Prehľad analytiky" aria-busy="true">
        <style>{analyticsStyles}</style>
        <div className="skala-analytics__header">
          <div><span className="skala-analytics__eyebrow">SKALA / PREHĽAD</span><h1>Analytika</h1><p>Načítavame anonymný prehľad aktivity.</p></div>
        </div>
        <div className="skala-analytics__skeleton-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => <div className="skala-analytics__skeleton" key={item} />)}
        </div>
        <div className="skala-analytics__skeleton skala-analytics__skeleton--wide" aria-hidden="true" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="skala-analytics" aria-label="Prehľad analytiky">
        <style>{analyticsStyles}</style>
        <div className="skala-analytics__header">
          <div><span className="skala-analytics__eyebrow">SKALA / PREHĽAD</span><h1>Analytika</h1></div>
        </div>
        <div className="skala-analytics__message" role="alert">
          <span className="skala-analytics__message-mark"><Activity size={20} aria-hidden="true" /></span>
          <div><h2>Prehľad sa nepodarilo načítať</h2><p>Skontrolujte pripojenie a skúste načítať údaje znova.</p></div>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="skala-analytics__retry">
            <RefreshCw size={15} aria-hidden="true" /> {isFetching ? 'Načítavam…' : 'Skúsiť znova'}
          </button>
        </div>
      </section>
    );
  }

  const hasActivity = data.visits > 0 || data.uniqueSessions > 0 || data.interactions > 0 || data.enquiries > 0 || data.daily.length > 0;
  const orderedEvents = [...data.events].sort((a, b) => b.count - a.count);
  return (
    <section className="skala-analytics" aria-label="Prehľad analytiky">
      <style>{analyticsStyles}</style>
      <header className="skala-analytics__header">
        <div>
          <span className="skala-analytics__eyebrow">SKALA / PREHĽAD MAJITEĽA</span>
          <h1>Analytika</h1>
          <p>Aktivita katalógu a dopyty — bez sledovania identity návštevníkov.</p>
        </div>
        <div className="skala-analytics__header-meta">
          <span className="skala-analytics__period">{formatDate(data.startDate)} <span aria-hidden="true">—</span> {formatDate(data.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span className="skala-analytics__period-caption">Posledných {data.periodDays} dní</span>
        </div>
      </header>

      <div className="skala-analytics__privacy">
        <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
        <p><strong>Súkromie na prvom mieste.</strong> Návštevy a interakcie v tomto prehľade pochádzajú iba od návštevníkov so súhlasom; zobrazujeme anonymné súhrny, nie identitu ani individuálne správanie.</p>
      </div>

      <div className="skala-analytics__metrics">
        <MetricCard label="Návštevy" value={data.visits} note={`Zobrazenia katalógu · ${data.periodDays}-dňové obdobie`} icon={BarChart3} />
        <MetricCard label="Anonymné relácie" value={data.uniqueSessions} note="Počet relácií, nie počet ľudí" icon={UsersRound} accent="gold" />
        <MetricCard label="Interakcie" value={data.interactions} note="Súčet zaznamenaných akcií v katalógu" icon={Activity} accent="clay" />
        <MetricCard label="Dopyty" value={data.enquiries} note="Uložené dopyty za zvolené obdobie" icon={ArrowUpRight} />
      </div>

      <div className="skala-analytics__main-grid">
        <section className="skala-analytics__panel skala-analytics__trend">
          <div className="skala-analytics__panel-heading">
            <div><span className="skala-analytics__eyebrow">VÝVOJ V ČASE</span><h2>Návštevnosť katalógu</h2></div>
            <span className="skala-analytics__unit">za deň</span>
          </div>
          {hasActivity ? <ActivityChart daily={data.daily} /> : (
            <div className="skala-analytics__chart-empty">V tomto období zatiaľ nie je zaznamenaná aktivita.</div>
          )}
        </section>
        <section className="skala-analytics__panel skala-analytics__accounts">
          <span className="skala-analytics__eyebrow">CELKOM OD ZAČIATKU</span>
          <div className="skala-analytics__account-value">{numberFormat.format(data.registeredAccounts)}</div>
          <h2>Registrované účty</h2>
          <p>Toto číslo je celkový počet registrácií, nie výsledok vybraného obdobia.</p>
          <div className="skala-analytics__account-rule" aria-hidden="true"><span /></div>
          <span className="skala-analytics__account-foot"><UsersRound size={14} aria-hidden="true" /> Agregovaný údaj</span>
        </section>
      </div>

      <section className="skala-analytics__panel skala-analytics__events">
        <div className="skala-analytics__panel-heading">
          <div><span className="skala-analytics__eyebrow">ČO ĽUDIA ROBIA</span><h2>Akcie v katalógu</h2></div>
          <span className="skala-analytics__unit">{orderedEvents.length} typov</span>
        </div>
        {orderedEvents.length > 0 ? (
          <div className="skala-analytics__event-list">
            {orderedEvents.map((event) => {
              const share = data.interactions > 0 ? (event.count / data.interactions) * 100 : 0;
              return (
                <div className="skala-analytics__event-row" key={event.eventName}>
                  <span className="skala-analytics__event-name">{eventLabels[event.eventName] ?? event.eventName}</span>
                  <span className="skala-analytics__event-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, share)}%` }} /></span>
                  <strong className="skala-analytics__event-count">{numberFormat.format(event.count)}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="skala-analytics__events-empty">
            <span className="skala-analytics__empty-icon"><ArrowDownRight size={19} aria-hidden="true" /></span>
            <div><h3>Zatiaľ bez zaznamenaných akcií</h3><p>Akcie sa zobrazia po tom, čo návštevníci začnú používať katalóg.</p></div>
          </div>
        )}
      </section>
      {!hasActivity && (
        <p className="skala-analytics__quiet-note">Pre zvolené obdobie zatiaľ nie sú dostupné údaje o aktivite. Prehľad sa naplní po prvých návštevách katalógu.</p>
      )}
    </section>
  );
}

const analyticsStyles = `
.skala-analytics {
  --sa-ink: #263d3b;
  --sa-muted: #6e7d76;
  --sa-line: #d7d8c9;
  --sa-paper: #f7f4e9;
  --sa-card: #fbf9f0;
  --sa-teal: #376761;
  --sa-clay: #bd806c;
  --sa-ochre: #c4a15e;
  color: var(--sa-ink);
  width: 100%;
  padding: clamp(22px, 3.8vw, 48px);
  background:
    radial-gradient(ellipse at 94% 0%, rgba(188, 163, 111, .11), transparent 30rem),
    var(--sa-paper);
  border: 1px solid rgba(61, 87, 78, .12);
  border-radius: 20px;
  font-family: var(--app-font-sans, 'Manrope', sans-serif);
  animation: sa-arrive .42s ease both;
}
.skala-analytics * { box-sizing: border-box; }
.skala-analytics h1, .skala-analytics h2, .skala-analytics h3, .skala-analytics p { margin-top: 0; }
.skala-analytics__header {
  display: flex; justify-content: space-between; align-items: end; gap: 24px;
  padding-bottom: 27px; border-bottom: 1px solid var(--sa-line);
}
.skala-analytics__eyebrow {
  display: block; color: var(--sa-teal);
  font: 500 .62rem/1.4 var(--app-font-mono, 'DM Mono', monospace);
  letter-spacing: .13em; text-transform: uppercase;
}
.skala-analytics__header h1 {
  font: 500 clamp(2.25rem, 4vw, 3.5rem)/1 var(--app-font-serif, 'Playfair Display', serif);
  letter-spacing: -.045em; margin: 9px 0 8px;
}
.skala-analytics__header p { margin: 0; color: var(--sa-muted); font-size: .8rem; line-height: 1.55; }
.skala-analytics__header-meta { text-align: right; flex: none; padding-bottom: 2px; }
.skala-analytics__period { display: block; font: 500 .78rem var(--app-font-mono, 'DM Mono', monospace); white-space: nowrap; }
.skala-analytics__period-caption { display: block; margin-top: 7px; color: var(--sa-muted); font-size: .68rem; }
.skala-analytics__privacy {
  display: flex; align-items: center; gap: 11px; margin: 19px 0 24px; padding: 12px 15px;
  background: rgba(55, 103, 97, .07); border: 1px solid rgba(55, 103, 97, .14);
  border-radius: 10px; color: var(--sa-teal);
}
.skala-analytics__privacy svg { flex: none; }
.skala-analytics__privacy p { margin: 0; color: #556b64; font-size: .71rem; line-height: 1.55; }
.skala-analytics__privacy strong { color: var(--sa-ink); }
.skala-analytics__metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.skala-analytics__metric {
  min-height: 142px; padding: 17px 18px 15px; background: var(--sa-card);
  border: 1px solid var(--sa-line); border-radius: 12px;
  box-shadow: 0 5px 16px rgba(42, 64, 58, .035);
  transition: transform .2s ease, box-shadow .2s ease;
}
.skala-analytics__metric:hover { transform: translateY(-2px); box-shadow: 0 9px 22px rgba(42, 64, 58, .08); }
.skala-analytics__metric-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; color: var(--sa-muted); font-size: .68rem; font-weight: 700; }
.skala-analytics__metric-top svg { color: var(--sa-teal); }
.skala-analytics__metric--clay .skala-analytics__metric-top svg { color: var(--sa-clay); }
.skala-analytics__metric--gold .skala-analytics__metric-top svg { color: #a88645; }
.skala-analytics__metric-value { display: block; margin-top: 17px; font: 500 2rem/.95 var(--app-font-mono, 'DM Mono', monospace); letter-spacing: -.07em; }
.skala-analytics__metric p { margin: 9px 0 0; color: var(--sa-muted); font-size: .63rem; line-height: 1.45; }
.skala-analytics__main-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(220px, .8fr); gap: 14px; margin-top: 14px; }
.skala-analytics__panel { background: var(--sa-card); border: 1px solid var(--sa-line); border-radius: 12px; padding: 21px 22px; }
.skala-analytics__panel-heading { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
.skala-analytics__panel-heading h2 { margin: 5px 0 0; font: 500 1.35rem/1.1 var(--app-font-serif, 'Playfair Display', serif); letter-spacing: -.025em; }
.skala-analytics__unit { color: var(--sa-muted); font: .62rem var(--app-font-mono, 'DM Mono', monospace); white-space: nowrap; }
.skala-analytics__chart-wrap { padding-top: 22px; }
.skala-analytics__chart { display: block; overflow: visible; width: 100%; height: auto; }
.skala-analytics__grid-line { stroke: #e6e5d8; stroke-width: 1; stroke-dasharray: 3 5; }
.skala-analytics__area { fill: rgba(55, 103, 97, .08); }
.skala-analytics__line { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.skala-analytics__line--visits { stroke: var(--sa-teal); }
.skala-analytics__line--sessions { stroke: var(--sa-clay); stroke-dasharray: 5 5; }
.skala-analytics__point { stroke: var(--sa-card); stroke-width: 2; vector-effect: non-scaling-stroke; }
.skala-analytics__point--visits { fill: var(--sa-teal); }
.skala-analytics__point--sessions { fill: var(--sa-clay); }
.skala-analytics__axis-label { fill: #7c8981; font: 10px var(--app-font-mono, 'DM Mono', monospace); }
.skala-analytics__legend { display: flex; gap: 20px; padding-top: 8px; color: var(--sa-muted); font-size: .64rem; }
.skala-analytics__legend span { display: inline-flex; align-items: center; gap: 7px; }
.skala-analytics__legend-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sa-teal); }
.skala-analytics__legend-dot--sessions { background: var(--sa-clay); }
.skala-analytics__chart-empty { display: grid; min-height: 180px; place-items: center; padding: 22px; color: var(--sa-muted); text-align: center; font-size: .75rem; line-height: 1.6; }
.skala-analytics__accounts { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; min-height: 278px; background: #304f4b; color: #f4f0e3; border-color: #304f4b; }
.skala-analytics__accounts::after { content: ''; position: absolute; width: 180px; height: 180px; right: -80px; top: -78px; border: 1px solid rgba(240, 229, 197, .2); border-radius: 50%; box-shadow: 0 0 0 17px rgba(240, 229, 197, .025), 0 0 0 36px rgba(240, 229, 197, .02); pointer-events: none; }
.skala-analytics__accounts .skala-analytics__eyebrow { color: #cdbd92; }
.skala-analytics__account-value { position: relative; z-index: 1; margin-top: 20px; font: 500 clamp(2.5rem, 4vw, 3.5rem)/.95 var(--app-font-mono, 'DM Mono', monospace); letter-spacing: -.09em; }
.skala-analytics__accounts h2 { position: relative; z-index: 1; margin: 10px 0 8px; font: 500 1.3rem var(--app-font-serif, 'Playfair Display', serif); }
.skala-analytics__accounts p { position: relative; z-index: 1; max-width: 245px; margin: 0; color: rgba(244, 240, 227, .7); font-size: .68rem; line-height: 1.6; }
.skala-analytics__account-rule { height: 1px; margin: 21px 0 12px; background: rgba(244, 240, 227, .2); }
.skala-analytics__account-rule span { display: block; width: 31%; height: 1px; background: #cdbd92; }
.skala-analytics__account-foot { display: inline-flex; align-items: center; gap: 7px; color: #d6cdaF; font: .59rem var(--app-font-mono, 'DM Mono', monospace); letter-spacing: .04em; }
.skala-analytics__events { margin-top: 14px; }
.skala-analytics__event-list { display: grid; gap: 0; margin-top: 18px; }
.skala-analytics__event-row { display: grid; grid-template-columns: minmax(160px, 1fr) minmax(80px, 1.45fr) 46px; align-items: center; gap: 15px; min-height: 41px; border-top: 1px solid #e7e5d9; }
.skala-analytics__event-name { overflow: hidden; color: #435852; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
.skala-analytics__event-bar { height: 5px; overflow: hidden; background: #ebe9dd; border-radius: 5px; }
.skala-analytics__event-bar i { display: block; height: 100%; min-width: 2px; border-radius: inherit; background: linear-gradient(90deg, #557f72, #b9a071); }
.skala-analytics__event-count { text-align: right; font: 500 .75rem var(--app-font-mono, 'DM Mono', monospace); }
.skala-analytics__events-empty { display: flex; align-items: center; gap: 13px; padding: 24px 0 5px; }
.skala-analytics__empty-icon, .skala-analytics__message-mark { display: grid; flex: none; width: 42px; height: 42px; place-items: center; border-radius: 50%; background: #eeede1; color: var(--sa-teal); }
.skala-analytics__events-empty h3 { margin: 0 0 4px; font: 500 1.05rem var(--app-font-serif, 'Playfair Display', serif); }
.skala-analytics__events-empty p { margin: 0; color: var(--sa-muted); font-size: .7rem; line-height: 1.5; }
.skala-analytics__quiet-note { margin: 15px 0 0; color: var(--sa-muted); font-size: .68rem; line-height: 1.55; }
.skala-analytics__message { display: flex; align-items: center; gap: 14px; margin-top: 25px; padding: 22px; border: 1px solid #ddc9bd; border-radius: 12px; background: #fbf4ee; }
.skala-analytics__message-mark { background: #f2e5dd; color: #a26450; }
.skala-analytics__message h2 { margin: 0 0 4px; font: 500 1.15rem var(--app-font-serif, 'Playfair Display', serif); }
.skala-analytics__message p { margin: 0; color: var(--sa-muted); font-size: .72rem; line-height: 1.5; }
.skala-analytics__retry { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; margin-left: auto; padding: 0 14px; border: 1px solid #bdc9be; border-radius: 999px; background: #f8f6ed; color: var(--sa-ink); font-size: .7rem; font-weight: 700; transition: background-color .2s, transform .2s; }
.skala-analytics__retry:hover:not(:disabled) { background: #e8eee5; transform: translateY(-1px); }
.skala-analytics__retry:disabled { opacity: .6; cursor: wait; }
.skala-analytics__skeleton-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 28px; }
.skala-analytics__skeleton { height: 142px; border: 1px solid var(--sa-line); border-radius: 12px; background: linear-gradient(100deg, #eeeade 20%, #f7f4e9 38%, #eeeade 56%); background-size: 220% 100%; animation: sa-shimmer 1.5s ease-in-out infinite; }
.skala-analytics__skeleton--wide { height: 290px; margin-top: 14px; }
@keyframes sa-arrive { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sa-shimmer { to { background-position-x: -220%; } }
@media (max-width: 900px) {
  .skala-analytics__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .skala-analytics__main-grid { grid-template-columns: minmax(0, 1.4fr) minmax(200px, .8fr); }
}
@media (max-width: 650px) {
  .skala-analytics { padding: 22px 16px; border-radius: 14px; }
  .skala-analytics__header { align-items: start; flex-direction: column; gap: 15px; }
  .skala-analytics__header-meta { text-align: left; }
  .skala-analytics__privacy { align-items: flex-start; }
  .skala-analytics__main-grid { grid-template-columns: 1fr; }
  .skala-analytics__accounts { min-height: 235px; }
  .skala-analytics__event-row { grid-template-columns: minmax(0, 1.2fr) minmax(52px, .9fr) 36px; gap: 9px; }
  .skala-analytics__panel { padding: 18px 15px; }
  .skala-analytics__message { align-items: flex-start; flex-wrap: wrap; padding: 17px; }
  .skala-analytics__retry { margin: 4px 0 0 56px; }
  .skala-analytics__skeleton-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .skala-analytics, .skala-analytics__skeleton { animation: none; }
  .skala-analytics__metric, .skala-analytics__retry { transition: none; }
}
`;

export default AnalyticsDashboard;