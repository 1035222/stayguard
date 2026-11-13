const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Heatmap({ data, loading, deviceName }) {
  const values = data.map((item) => item.avg_db).filter(Number.isFinite);
  const max = Math.max(70, ...values);
  const cells = new Map(data.map((item) => [`${item.weekday}-${item.hour}`, item]));

  return (
    <section className="panel heatmap-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PATRÓN SEMANAL · HORA LOCAL</span>
          <h2>¿A qué horas hay más ruido?</h2>
          <p className="muted small">{deviceName || 'Dispositivo'} · Promedio de decibeles · últimos 7 días</p>
        </div>
        <div className="heat-legend"><span>Tranquilo</span><i /><i /><i /><i /><span>Más ruido</span></div>
      </div>
      {loading ? (
        <div className="heatmap-skeleton" aria-label="Cargando mapa de calor"><span /><span /><span /><span /><span /><span /><span /></div>
      ) : (
        <div className="heatmap-scroll">
          <div className="heatmap">
            <div className="heat-hours"><span />{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{hour % 3 === 0 ? `${String(hour).padStart(2, '0')}` : ''}</span>)}</div>
            {DAYS.map((day, weekday) => (
              <div className="heat-row" key={day}>
                <span className="heat-day">{day}</span>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = cells.get(`${weekday}-${hour}`);
                  const db = cell?.avg_db;
                  const intensity = db == null ? 0 : Math.max(0.08, Math.min(1, (db - 35) / (max - 35)));
                  const label = db == null
                    ? `${day}, ${String(hour).padStart(2, '0')}:00: sin datos`
                    : `${day}, ${String(hour).padStart(2, '0')}:00 · ${Number(db).toFixed(1)} dB promedio · ${cell.samples} muestras`;
                  return (
                    <span
                      key={hour}
                      className="heat-cell"
                      style={{ '--heat-intensity': intensity }}
                      title={label}
                      aria-label={label}
                      role="img"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="heatmap-note">Hora de Colombia (UTC−5). El sensor PIR detecta movimiento; no cuenta personas.</p>
    </section>
  );
}
