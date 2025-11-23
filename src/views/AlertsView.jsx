import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Icon, alertLevelIcons } from '../components/Icon';

export default function AlertsView({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const res = await api.listAlerts({ usuario_id: userId });
      let alerts = Array.isArray(res)
        ? res
        : (Array.isArray(res?.alertas) ? res.alertas
          : Array.isArray(res?.items) ? res.items
          : Array.isArray(res?.data?.alertas) ? res.data.alertas
          : Array.isArray(res?.data) ? res.data
          : []);
      setItems(alerts);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const markRead = async (id) => {
    try { await api.markAlertRead(id); load(); } catch (e) { alert(e.message); }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const normEstado = (a) => ((a?.estado || a?.status || '') + '').toUpperCase();
  const normNivel = (a) => ((a?.nivel || a?.level || 'INFO') + '').toUpperCase();
  const titleOf = (a) => a?.titulo || a?.title || 'Alerta';
  const messageOf = (a) => a?.mensaje || a?.message || '';
  const dateOf = (a) => a?.creado_en || a?.created_at || a?.fecha || a?.timestamp || new Date().toISOString();

  const pendingAlerts = items.filter(a => normEstado(a) !== 'LEIDA');
  const readAlerts = items.filter(a => normEstado(a) === 'LEIDA');

  return (
    <div className="view">
      <h2>Alertas</h2>
      {loading && <p className="loading">Cargando alertas...</p>}
      {error && <p className="error">{error}</p>}
      
      {pendingAlerts.length > 0 && (
        <>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.25rem' }}>
            Pendientes ({pendingAlerts.length})
          </h3>
          <ul className="list">
            {pendingAlerts.map(a => (
              <li key={a.id}>
                <div className="alert-item">
                  <div className={`alert-icon ${normNivel(a).toLowerCase()}`}>
                    <Icon name={alertLevelIcons[normNivel(a)] || 'info'} size={20} />
                  </div>
                  <div className="alert-content">
                    <strong>{titleOf(a)}</strong>
                    <p>{messageOf(a)}</p>
                    <small style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(dateOf(a))}
                    </small>
                  </div>
                  <button className="btn-secondary" onClick={() => markRead(a.id)}>
                    Marcar leída
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {readAlerts.length > 0 && (
        <>
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
            Leídas ({readAlerts.length})
          </h3>
          <ul className="list">
            {readAlerts.map(a => (
              <li key={a.id} style={{ opacity: 0.6 }}>
                <div className="alert-item">
                  <div className={`alert-icon ${normNivel(a).toLowerCase()}`}>
                    <Icon name={alertLevelIcons[normNivel(a)] || 'info'} size={20} />
                  </div>
                  <div className="alert-content">
                    <strong>{titleOf(a)}</strong>
                    <p>{messageOf(a)}</p>
                    <small style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(dateOf(a))}
                    </small>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {items.length === 0 && !loading && (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3>No hay alertas</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Todo está en orden. Te notificaremos si hay algo importante.
          </p>
        </div>
      )}
    </div>
  );
}