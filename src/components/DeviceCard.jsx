import { useState } from 'react';
import Gauge from './Gauge.jsx';
import NoiseChart from './NoiseChart.jsx';

const RANGES = [
  ['1h', '1 hora'],
  ['6h', '6 horas'],
  ['24h', '24 horas'],
  ['7d', '7 días'],
];

function ConfigForm({ device, onSave, onClose }) {
  const [threshold, setThreshold] = useState(device.noise_threshold);
  const [rearm, setRearm] = useState(device.rearm_threshold);
  const [duration, setDuration] = useState(device.min_duration_s);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave(device.device_id, {
        noise_threshold: Number(threshold),
        rearm_threshold: Number(rearm),
        min_duration_s: Number(duration),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="config-drawer" role="dialog" aria-modal="true" aria-labelledby="config-title" onSubmit={submit}>
        <div className="section-heading">
          <div><span className="eyebrow">CONFIGURACIÓN</span><h2 id="config-title">Umbrales del dispositivo</h2></div>
          <button type="button" className="icon-button" aria-label="Cerrar ajustes" onClick={onClose}>×</button>
        </div>
        <p className="muted small">{device.property_name} · {device.device_id}</p>
        <label>
          Umbral de alerta (dB)
          <input type="number" min="30" max="120" step="0.5" value={threshold} onChange={(event) => setThreshold(event.target.value)} required />
        </label>
        <label>
          Umbral de rearme (dB)
          <input type="number" min="30" max="119.5" step="0.5" value={rearm} onChange={(event) => setRearm(event.target.value)} required />
        </label>
        <label>
          Duración mínima del evento (segundos)
          <input type="number" min="1" max="300" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} required />
        </label>
        <div className="threshold-preview" aria-label={`Vista previa de línea de umbral en ${threshold} decibeles`}>
          <div className="preview-grid"><span /><span /><span /></div>
          <span className="preview-line" style={{ top: `${100 - Math.max(0, Math.min(100, (Number(threshold) - 30) / 70 * 100))}%` }} />
          <span className="preview-label">{Number(threshold) || 0} dB · Umbral de alerta</span>
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="config-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ajustes'}</button>
        </div>
        <p className="muted small">El dispositivo aplicará estos valores en su próxima consulta de configuración.</p>
      </form>
    </div>
  );
}

export default function DeviceCard({ device, data, incidents, range, onRangeChange, onSaveConfig, updating }) {
  const [editing, setEditing] = useState(false);
  const lastSeen = device.last_seen_at
    ? new Date(device.last_seen_at).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
    })
    : 'sin registro';

  return (
    <article className={`device-panel ${device.online ? '' : 'is-offline'} ${updating ? 'is-updating' : ''}`}>
      <header className="device-head">
        <div className="device-ident">
          <span className="device-glyph" aria-hidden="true">⌁</span>
          <div><span className="eyebrow">MONITOR DE RUIDO</span><h2>{device.property_name}</h2><span className="mono muted">{device.device_id}</span></div>
        </div>
        <span className={`status-badge ${device.online ? 'status-online' : 'status-offline'}`}>
          <span aria-hidden="true">{device.online ? '●' : '○'}</span> {device.online ? 'En línea' : 'Dispositivo offline'}
        </span>
      </header>

      <div className="device-live-row">
        <Gauge value={device.last_db == null ? null : Number(device.last_db)} threshold={Number(device.noise_threshold)} rearm={Number(device.rearm_threshold)} online={device.online} />
        <div className="device-side-info">
          <div className="live-readout">
            <span className={`activity-symbol ${device.last_motion ? 'is-active' : ''}`} aria-hidden="true">{device.last_motion ? '↗' : '·'}</span>
            <div><strong>Actividad / Movimiento</strong><span>{device.last_motion ? 'Movimiento detectado' : 'Sin movimiento detectado'}</span></div>
          </div>
          <div className="heartbeat"><span className="heartbeat-icon" aria-hidden="true">◷</span><span>{device.online ? 'Último latido' : 'Último latido recibido'}<strong>{lastSeen}</strong></span></div>
          {!device.online && <p className="offline-note">No recibimos señal reciente de este dispositivo.</p>}
        </div>
      </div>

      <div className="chart-heading">
        <div><h3>Nivel de ruido</h3><span className="muted small">dB promedio y pico · hora de Colombia</span></div>
        <div className="range-switch" role="group" aria-label="Rango de la gráfica">
          {RANGES.map(([value, label]) => (
            <button key={value} type="button" className={range === value ? 'is-selected' : ''} aria-pressed={range === value} aria-label={`Ver ${label}`} onClick={() => onRangeChange(value)}>{value}</button>
          ))}
        </div>
      </div>
      <NoiseChart data={data?.series || []} threshold={Number(device.noise_threshold)} incidents={incidents} deviceId={device.device_id} />

      <footer className="device-footer">
        {device.telegram_linked ? (
          <span className="tag tag-ok">✓ Telegram vinculado</span>
        ) : (
          <span className="muted small">Telegram: envía <code>/vincular {device.link_code}</code></span>
        )}
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>Ajustes de umbral</button>
      </footer>
      {editing && <ConfigForm device={device} onSave={onSaveConfig} onClose={() => setEditing(false)} />}
    </article>
  );
}
