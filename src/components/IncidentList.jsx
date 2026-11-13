import { useMemo, useState } from 'react';

const STATUS = {
  open: { label: 'Abierto', icon: '●', cls: 'tag-danger' },
  acknowledged: { label: 'Atendido', icon: '✓', cls: 'tag-ok' },
  ignored: { label: 'Ignorado', icon: '–', cls: 'tag-neutral' },
};

function dayKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function dayLabel(date) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const key = dayKey(date);
  if (key === today) return 'Hoy';
  if (key === yesterday) return 'Ayer';
  return date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
}

const timestamp = (value) => new Date(value).toLocaleTimeString('es-CO', {
  timeZone: 'America/Bogota',
  hour: '2-digit',
  minute: '2-digit',
});

export default function IncidentList({ incidents, onChangeStatus, soundEnabled, onSoundChange }) {
  const [filter, setFilter] = useState('all');
  const groups = useMemo(() => {
    const filtered = incidents.filter((incident) => filter === 'all' || incident.status === filter);
    const byDay = new Map();
    filtered.forEach((incident) => {
      const date = new Date(incident.created_at);
      const key = dayKey(date);
      if (!byDay.has(key)) byDay.set(key, { date, incidents: [] });
      byDay.get(key).incidents.push(incident);
    });
    return [...byDay.values()].sort((a, b) => b.date - a.date);
  }, [incidents, filter]);
  const filters = [['all', 'Todos'], ['open', 'Abiertos'], ['acknowledged', 'Atendidos'], ['ignored', 'Ignorados']];

  return (
    <section className="panel timeline-panel">
      <div className="section-heading timeline-heading">
        <div><span className="eyebrow">MONITOREO</span><h2>Actividad reciente</h2><p className="muted small">Incidentes registrados · hora de Colombia</p></div>
        <label className="sound-toggle">
          <input type="checkbox" checked={soundEnabled} onChange={(event) => onSoundChange(event.target.checked)} />
          <span>Alertas sonoras</span>
        </label>
      </div>
      <div className="filter-row" role="group" aria-label="Filtrar incidentes">
        {filters.map(([value, label]) => (
          <button key={value} type="button" className={`filter-chip ${filter === value ? 'is-selected' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      {!groups.length ? (
        <div className="timeline-empty"><span aria-hidden="true">✓</span><strong>Todo en calma</strong><p>{filter === 'all' ? 'No hay incidentes en este periodo. Te avisaremos si detectamos ruido por encima del umbral.' : 'No hay incidentes con este estado.'}</p></div>
      ) : (
        <div className="timeline">
          {groups.map((group) => (
            <section className="timeline-day" key={dayKey(group.date)}>
              <div className="timeline-day-heading"><h3>{dayLabel(group.date)}</h3><span>{group.incidents.length} {group.incidents.length === 1 ? 'evento' : 'eventos'}</span></div>
              <div className="timeline-items">
                {group.incidents.map((incident) => {
                  const status = STATUS[incident.status] || STATUS.open;
                  return (
                    <article className={`timeline-item incident-${incident.status}`} key={incident.id}>
                      <div className="timeline-time"><strong>{timestamp(incident.created_at)}</strong><span>COT</span></div>
                      <div className="timeline-content">
                        <div className="timeline-title-row">
                          <div className="incident-heading"><span className={`timeline-marker ${status.cls}`} aria-hidden="true">{incident.status === 'open' ? '!' : status.icon}</span><strong>{incident.property_name || incident.device_id}</strong></div>
                          <span className={`tag ${status.cls}`}>{status.icon} {status.label}</span>
                        </div>
                        <span className="muted small incident-device">{incident.device_id} <span aria-hidden="true">·</span> {incident.motion ? 'Movimiento detectado' : 'Sin movimiento detectado'}</span>
                        <div className="incident-metrics">
                          <span className="incident-metric"><strong className="mono">{Number(incident.peak_db).toFixed(1)} dB</strong><span>Pico de ruido</span></span>
                          <span className="incident-metric"><strong className="mono">{incident.duration_s}s</strong><span>Duración</span></span>
                        </div>
                        {incident.status === 'open' && (
                          <div className="incident-actions">
                            <button className="btn btn-sm btn-primary" onClick={() => onChangeStatus(incident.id, 'acknowledged')}>✓ Atendido</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => onChangeStatus(incident.id, 'ignored')}>Ignorar</button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
