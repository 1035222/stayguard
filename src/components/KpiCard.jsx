function sparkline(values = []) {
  const points = values.filter((value) => Number.isFinite(value));
  if (!points.length) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  return points.map((value, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 28 - ((value - min) / (max - min || 1)) * 22;
    return `${x},${y}`;
  }).join(' ');
}

export default function KpiCard({ label, value, unit, change, series = [], icon, invertChange = false }) {
  const positive = Number(change) > 0;
  const negative = Number(change) < 0;
  const favorable = invertChange ? negative : !positive;
  const changeLabel = change == null ? 'Sin periodo previo' : `${positive ? '+' : ''}${Number(change).toLocaleString('es-CO')}% vs. periodo anterior`;
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('es-CO', { maximumFractionDigits: 1 })
    : value ?? '—';
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-icon" aria-hidden="true">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value-row">
        <strong className="kpi-value">{formattedValue}</strong>
        {unit && <span className="kpi-unit">{unit}</span>}
        <svg className="kpi-sparkline" viewBox="0 0 100 32" aria-hidden="true">
          <polyline points={sparkline(series)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className={`kpi-change ${change == null ? 'is-neutral' : favorable ? 'is-good' : 'is-bad'}`}>
        {change == null ? '↗' : positive ? '↑' : negative ? '↓' : '→'} {changeLabel}
      </span>
    </article>
  );
}
