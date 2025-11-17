import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function SystemStatusView() {
  const [root, setRoot] = useState(null);
  const [health, setHealth] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [r, h, m] = await Promise.all([
        api.getRoot(), api.getHealth(), api.getMonitorStatus()
      ]);
      setRoot(r); setHealth(h); setMonitor(m);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="view">
      <h2>Sistema / Monitor</h2>
      <button onClick={load}>Refrescar</button>
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      <div className="status-grid">
        <pre>{root && JSON.stringify(root, null, 2)}</pre>
        <pre>{health && JSON.stringify(health, null, 2)}</pre>
        <pre>{monitor && JSON.stringify(monitor, null, 2)}</pre>
      </div>
    </div>
  );
}