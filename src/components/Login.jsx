import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = mode === 'login' ? await api.login(email, password) : await api.register(email, password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-dot" /> StayGuard
        </div>
        <p className="muted">Monitoreo de ruido y movimiento para tus propiedades.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'No tengo cuenta, registrarme' : 'Ya tengo cuenta, entrar'}
        </button>
      </form>
    </main>
  );
}
