import { useCallback, useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

const STORAGE_KEY = 'stayguard.session';

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(loadSession);

  const handleLogin = useCallback((data) => {
    const next = { token: data.token, user: data.user };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* almacenamiento no disponible */
    }
    setSession(next);
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    setSession(null);
  }, []);

  if (!session) return <Login onLogin={handleLogin} />;
  return <Dashboard token={session.token} user={session.user} onLogout={handleLogout} />;
}
