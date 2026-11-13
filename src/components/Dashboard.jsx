import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '../api.js';
import DeviceCard from './DeviceCard.jsx';
import Heatmap from './Heatmap.jsx';
import IncidentList from './IncidentList.jsx';
import KpiCard from './KpiCard.jsx';

const THEME_KEY = 'stayguard.theme';
const RANGES = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function formatUpdated() {
  return new Date().toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function SkeletonCard() {
  return <div className="skeleton-card" aria-label="Cargando resumen"><span /><span /><span /></div>;
}

function playAlert() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 740;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
  oscillator.onended = () => context.close();
}

export default function Dashboard({ token, user, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [overview, setOverview] = useState(null);
  const [dataByDevice, setDataByDevice] = useState({});
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [range, setRange] = useState('24h');
  const [property, setProperty] = useState('all');
  const [theme, setTheme] = useState(loadTheme);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [toast, setToast] = useState(null);
  const [statusPulse, setStatusPulse] = useState('');
  const toastTimer = useRef(null);
  const liveSettings = useRef({ range, soundEnabled });

  useEffect(() => {
    liveSettings.current = { range, soundEnabled };
  }, [range, soundEnabled]);

  const handleError = useCallback((err) => {
    if (err.status === 401) onLogout();
    else setError(err.message);
  }, [onLogout]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // El tema permanece activo en memoria si el almacenamiento está bloqueado.
    }
  }, [theme]);

  const openIncidents = incidents.filter((incident) => incident.status === 'open').length;
  useEffect(() => {
    document.title = `${openIncidents ? `(${openIncidents}) ` : ''}Incidentes abiertos · StayGuard`;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const palette = getComputedStyle(document.documentElement);
      context.fillStyle = palette.getPropertyValue('--bg').trim();
      context.fillRect(0, 0, 64, 64);
      context.fillStyle = palette.getPropertyValue('--accent').trim();
      context.beginPath();
      context.roundRect(8, 8, 48, 48, 15);
      context.fill();
      context.fillStyle = palette.getPropertyValue('--bg').trim();
      context.font = 'bold 34px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(openIncidents > 9 ? '9+' : String(openIncidents || 'S'), 32, 34);
      let icon = document.querySelector('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = canvas.toDataURL('image/png');
    }
  }, [openIncidents, theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [deviceRows, incidentRows, overviewData] = await Promise.all([
          api.devices(token),
          api.incidents(token),
          api.overview(token, 24),
        ]);
        if (cancelled) return;
        setDevices(deviceRows);
        setIncidents(incidentRows);
        setOverview(overviewData);
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, handleError]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      api.overview(token, 24).then(setOverview).catch(handleError);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [token, handleError]);

  const deviceIds = devices.map((device) => device.device_id).join('|');
  useEffect(() => {
    if (!deviceIds) {
      setDataByDevice({});
      return undefined;
    }
    let cancelled = false;
    setChartLoading(true);
    (async () => {
      try {
        const rows = await Promise.all(devices.map(async (device) => {
          if (range === '1h' || range === '6h') {
            const series = await api.telemetry(token, device.device_id, RANGES[range]);
            return [device.device_id, { series, incidents: [] }];
          }
          const result = await api.summary(token, device.device_id, range);
          return [device.device_id, result];
        }));
        if (!cancelled) setDataByDevice(Object.fromEntries(rows));
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deviceIds, range, token, handleError]);

  const properties = useMemo(() => {
    const byId = new Map();
    devices.forEach((device) => byId.set(String(device.property_id), device.property_name));
    return [...byId.entries()];
  }, [devices]);
  const visibleDevices = useMemo(
    () => devices.filter((device) => property === 'all' || String(device.property_id) === property),
    [devices, property]
  );
  const heatmapDevice = visibleDevices[0];
  useEffect(() => {
    if (!heatmapDevice) {
      setHeatmap([]);
      return undefined;
    }
    let cancelled = false;
    setHeatmapLoading(true);
    api.heatmap(token, heatmapDevice.device_id, 7)
      .then((result) => { if (!cancelled) setHeatmap(result); })
      .catch((err) => { if (!cancelled) handleError(err); })
      .finally(() => { if (!cancelled) setHeatmapLoading(false); });
    return () => { cancelled = true; };
  }, [token, heatmapDevice?.device_id, handleError]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token } });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', (err) => {
      setLive(false);
      if (err.message === 'unauthorized') onLogout();
    });
    socket.on('telemetry', (telemetry) => {
      setDevices((prev) => prev.map((device) => device.device_id === telemetry.device_id
        ? { ...device, last_db: telemetry.db_level, last_motion: telemetry.motion, online: true, last_seen_at: telemetry.at }
        : device));
      setDataByDevice((prev) => {
        const current = prev[telemetry.device_id] || { series: [], incidents: [] };
        const ts = new Date(telemetry.at).getTime();
        const bucketMs = liveSettings.current.range === '7d' ? 3_600_000 : 60_000;
        const pointTime = Math.floor(ts / bucketMs) * bucketMs;
        const points = [...(current.series || [])];
        const existingIndex = points.findIndex((point) => point.ts === pointTime);
        const point = { ts: pointTime, avg_db: telemetry.db_level, max_db: telemetry.db_level, motion: telemetry.motion, samples: 1 };
        if (existingIndex >= 0) {
          const previousPoint = points[existingIndex];
          const samples = Number(previousPoint.samples) || 1;
          const nextSamples = samples + 1;
          points[existingIndex] = {
            ...previousPoint,
            avg_db: ((Number(previousPoint.avg_db) * samples) + telemetry.db_level) / nextSamples,
            max_db: Math.max(Number(previousPoint.max_db) || 0, telemetry.db_level),
            motion: telemetry.motion,
            samples: nextSamples,
          };
        }
        else points.push(point);
        const cutoff = Date.now() - RANGES[liveSettings.current.range] * 3_600_000;
        return { ...prev, [telemetry.device_id]: { ...current, series: points.filter((item) => item.ts >= cutoff).slice(-1500) } };
      });
    });
    socket.on('device:status', ({ device_id, online, at }) => {
      setDevices((prev) => prev.map((device) => device.device_id === device_id
        ? { ...device, online, ...(at ? { last_seen_at: at } : {}) }
        : device));
      setStatusPulse(device_id);
      window.setTimeout(() => setStatusPulse(''), 900);
    });
    socket.on('incident:new', (incident) => {
      setIncidents((prev) => [incident, ...prev.filter((item) => item.id !== incident.id)].slice(0, 200));
      setToast(incident);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 8000);
      if (liveSettings.current.soundEnabled) {
        try {
          playAlert();
        } catch (err) {
          setError(`No se pudo reproducir el sonido: ${err.message}`);
        }
      }
      api.overview(token, 24).then(setOverview).catch(handleError);
    });
    socket.on('incident:update', ({ id, status }) => {
      setIncidents((prev) => prev.map((incident) => (incident.id === id ? { ...incident, status } : incident)));
    });
    return () => {
      socket.disconnect();
      window.clearTimeout(toastTimer.current);
    };
  }, [token, onLogout, handleError]);

  const changeIncidentStatus = async (id, status) => {
    try {
      await api.setIncidentStatus(token, id, status);
      setIncidents((prev) => prev.map((incident) => (incident.id === id ? { ...incident, status } : incident)));
    } catch (err) {
      handleError(err);
    }
  };

  const saveConfig = async (deviceId, config) => {
    await api.updateConfig(token, deviceId, config);
    setDevices((prev) => prev.map((device) => (device.device_id === deviceId ? { ...device, ...config } : device)));
  };

  const current = overview?.current || {};
  const previous = overview?.previous || {};
  const changes = overview?.changes || {};
  const onlineCount = devices.filter((device) => device.online).length;
  const spark = (key) => [previous[key], current[key]].filter((value) => Number.isFinite(Number(value))).map(Number);
  const greetingHour = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }).format(new Date()));
  const greeting = greetingHour < 12 ? 'Buenos días' : greetingHour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="StayGuard, inicio"><span className="brand-mark" aria-hidden="true">S</span><span>Stay<span className="brand-light">Guard</span></span></a>
        <div className="topbar-controls">
          <span className={`connection ${live ? 'is-live' : ''}`} aria-label={live ? 'Conexión en vivo' : 'Sin conexión en vivo'}>
            <span className="connection-dot" />{live ? 'En vivo' : 'Sin conexión'}
          </span>
          <label className="property-select-label" htmlFor="property-select">Propiedad</label>
          <select id="property-select" className="property-select" value={property} onChange={(event) => setProperty(event.target.value)} aria-label="Seleccionar propiedad">
            <option value="all">Todas las propiedades</option>
            {properties.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
          <button className="icon-button theme-toggle" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>{theme === 'dark' ? '☼' : '☾'}</button>
          <details className="user-menu">
            <summary aria-label="Menú de usuario"><span className="user-avatar">{user.email.slice(0, 1).toUpperCase()}</span><span className="user-email">{user.email}</span><span aria-hidden="true">⌄</span></summary>
            <div className="user-dropdown"><span className="muted small">{user.email}</span><button className="btn btn-ghost" onClick={onLogout}>Cerrar sesión</button></div>
          </details>
        </div>
      </header>

      <main className="content">
        <section className="welcome-row">
          <div><span className="eyebrow">CENTRO DE MONITOREO · MEDELLÍN</span><h1>{greeting}, {user.email.split('@')[0]}</h1><p className="muted">Este es el estado de ruido y movimiento en tus propiedades.</p></div>
          <span className="updated-at">Actualizado {formatUpdated()} · COT</span>
        </section>

        {error && <div className="error" role="alert">{error}<button className="error-dismiss" aria-label="Cerrar mensaje" onClick={() => setError('')}>×</button></div>}

        <section className="kpi-grid" aria-label="Indicadores del periodo actual">
          {loading && !overview ? (
            Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)
          ) : (
            <>
              <KpiCard label="Incidentes · últimas 24 h" value={current.incidents} change={changes.incidents} series={spark('incidents')} icon="◉" invertChange />
              <KpiCard label="Ruido promedio" value={current.avg_db} unit="dB" change={changes.avg_db} series={spark('avg_db')} icon="〰" />
              <KpiCard label="Pico de ruido" value={current.peak_db} unit="dB" change={changes.peak_db} series={spark('peak_db')} icon="⌁" />
              <KpiCard label="Sobre el umbral" value={current.noisy_minutes} unit="min" change={changes.noisy_minutes} series={spark('noisy_minutes')} icon="◷" />
              <KpiCard label="Dispositivos en línea" value={`${onlineCount}/${current.devices_total ?? devices.length}`} unit="" change={null} series={[onlineCount, onlineCount]} icon="⌂" />
            </>
          )}
        </section>

        {loading ? (
          <section className="device-grid" aria-label="Cargando dispositivos"><SkeletonCard /><SkeletonCard /></section>
        ) : !devices.length ? (
          <div className="empty">
            <span className="empty-icon" aria-hidden="true">⌁</span><h2>Aún no hay dispositivos</h2>
            <p className="muted">Ejecuta <code>npm run seed</code> en el backend para crear el dispositivo de prueba STAYGUARD_01.</p>
          </div>
        ) : (
          <>
            <section className="device-grid" aria-label="Monitoreo por dispositivo">
              {visibleDevices.map((device) => {
                const cutoff = Date.now() - RANGES[range] * 3_600_000;
                const incidentRows = (dataByDevice[device.device_id]?.incidents?.length
                  ? dataByDevice[device.device_id].incidents
                  : incidents.filter((incident) => incident.device_id === device.device_id))
                  .filter((incident) => new Date(incident.created_at).getTime() >= cutoff);
                return (
                  <DeviceCard
                    key={device.device_id}
                    device={device}
                    data={dataByDevice[device.device_id]}
                    incidents={incidentRows}
                    range={range}
                    updating={statusPulse === device.device_id}
                    onRangeChange={setRange}
                    onSaveConfig={saveConfig}
                  />
                );
              })}
            </section>
            {chartLoading && <p className="loading-inline" role="status">Actualizando gráficas…</p>}
            <Heatmap data={heatmap} loading={heatmapLoading} deviceName={heatmapDevice?.device_id} />
          </>
        )}

        <IncidentList incidents={incidents} onChangeStatus={changeIncidentStatus} soundEnabled={soundEnabled} onSoundChange={setSoundEnabled} />
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">!</span>
          <div><strong>Nuevo incidente de ruido</strong><span>{toast.property_name || toast.device_id} · {Number(toast.peak_db).toFixed(1)} dB pico</span></div>
          <button className="icon-button" aria-label="Cerrar notificación" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}
