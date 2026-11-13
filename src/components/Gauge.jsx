const MIN = 30;
const MAX = 100;
const R = 78;
const CX = 100;
const CY = 100;

const point = (progress, radius = R) => {
  const angle = Math.PI * (1 - progress);
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
};

const arc = (from, to) => {
  const [sx, sy] = point(from);
  const [ex, ey] = point(to);
  return `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`;
};

export function levelColor(value, threshold, rearm) {
  if (value == null) return 'var(--muted)';
  if (value >= threshold) return 'var(--danger)';
  if (value > rearm) return 'var(--warn)';
  return 'var(--ok)';
}

export default function Gauge({ value, threshold, rearm, online }) {
  const clamp = (number) => Math.min(MAX, Math.max(MIN, number));
  const progress = value == null ? 0 : (clamp(value) - MIN) / (MAX - MIN);
  const thresholdProgress = (clamp(threshold) - MIN) / (MAX - MIN);
  const rearmProgress = (clamp(rearm) - MIN) / (MAX - MIN);
  const color = online ? levelColor(value, threshold, rearm) : 'var(--muted)';
  const [tx1, ty1] = point(thresholdProgress, R - 12);
  const [tx2, ty2] = point(thresholdProgress, R + 12);
  const label = value == null ? 'sin datos' : `${Number(value).toFixed(1)} dB`;

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 120" role="img" aria-label={`Medidor de ruido: ${label}. Umbral de alerta: ${threshold} dB.`}>
        <path d={arc(0, 1)} className="gauge-track" />
        <path d={arc(0, rearmProgress)} className="gauge-zone gauge-zone-ok" />
        <path d={arc(rearmProgress, thresholdProgress)} className="gauge-zone gauge-zone-warn" />
        <path d={arc(thresholdProgress, 1)} className="gauge-zone gauge-zone-danger" />
        {value != null && <path d={arc(0, progress)} className="gauge-value" style={{ '--gauge-value': color }} />}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} className="gauge-threshold" />
      </svg>
      <div className="gauge-reading">
        <span className="gauge-number" style={{ color }}>{value == null ? '--' : Number(value).toFixed(1)}</span>
        <span className="gauge-unit">dB</span>
      </div>
      <div className="gauge-legend" aria-label={`Umbral de alerta ${threshold} decibeles`}>
        <span><i className="legend-dot legend-green" /> Normal</span>
        <span><i className="legend-dot legend-amber" /> Atención</span>
        <span><i className="legend-dot legend-red" /> Umbral {threshold} dB</span>
      </div>
    </div>
  );
}
