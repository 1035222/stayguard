export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('No se pudo conectar con el servidor');
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: { email, password } }),
  devices: (token) => request('/api/devices', { token }),
  overview: (token, hours = 24) => request(`/api/stats/overview?hours=${hours}`, { token }),
  telemetry: (token, deviceId, hours = 6) =>
    request(`/api/devices/${encodeURIComponent(deviceId)}/telemetry?hours=${hours}`, { token }),
  heatmap: (token, deviceId, days = 7) =>
    request(`/api/devices/${encodeURIComponent(deviceId)}/heatmap?days=${days}`, { token }),
  summary: (token, deviceId, range = '24h') =>
    request(`/api/devices/${encodeURIComponent(deviceId)}/summary?range=${range}`, { token }),
  updateConfig: (token, deviceId, config) =>
    request(`/api/devices/${encodeURIComponent(deviceId)}/config`, { method: 'PATCH', body: config, token }),
  incidents: (token) => request('/api/incidents?limit=50', { token }),
  setIncidentStatus: (token, id, status) =>
    request(`/api/incidents/${id}`, { method: 'PATCH', body: { status }, token }),
};
