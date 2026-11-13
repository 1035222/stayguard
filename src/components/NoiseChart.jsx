import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const dateTime = (ts) =>
  new Date(ts).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{dateTime(label)}</strong>
      <span>{Number(point.max_db).toFixed(1)} dB pico</span>
      <span>{Number(point.avg_db).toFixed(1)} dB promedio</span>
      <span>{point.motion ? 'Movimiento detectado' : 'Sin movimiento detectado'}</span>
    </div>
  );
}

export default function NoiseChart({ data = [], threshold, incidents = [], deviceId = 'sensor' }) {
  const gradientId = `noise-fill-${deviceId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  if (data.length < 2) {
    return <div className="chart-empty">Esperando más datos del dispositivo para graficar.</div>;
  }

  return (
    <div className="chart-wrap" role="img" aria-label="Gráfica de ruido en decibeles con actividad de movimiento y umbral de alerta">
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis domain={[30, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          {incidents.map((incident) => {
            const start = new Date(incident.created_at).getTime();
            return (
              <ReferenceArea
                key={incident.id}
                x1={start}
                x2={start + Math.max(60, Number(incident.duration_s || 0)) * 1000}
                fill="var(--danger)"
                fillOpacity={0.14}
                strokeOpacity={0}
              />
            );
          })}
          <ReferenceLine y={threshold} stroke="var(--danger)" strokeDasharray="5 4" label={{ value: `Umbral ${threshold} dB`, fill: 'var(--danger)', fontSize: 10 }} />
          <Area type="monotone" dataKey="max_db" stroke="var(--accent)" strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
