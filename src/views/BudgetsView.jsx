import React, { useEffect, useState } from 'react';
import api from '../api/client';

const categorias = ['ALIMENTACION','TRANSPORTE','ENTRETENIMIENTO','VIVIENDA','SERVICIOS','SALUD','EDUCACION','OTROS'];

const categoryLabels = {
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  vivienda: 'Vivienda',
  servicios: 'Servicios',
  salud: 'Salud',
  educacion: 'Educación',
  otros: 'Otros'
};

function currentMonthYear() {
  const d = new Date();
  return { mes: d.getMonth() + 1, anio: d.getFullYear() };
}

export default function BudgetsView({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [{ mes, anio }] = useState(currentMonthYear());
  const [form, setForm] = useState({ categoria: 'ALIMENTACION', monto_limite: '' });

  const load = async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const data = await api.listBudgets({ usuario_id: userId, mes, anio });
      setItems(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId, mes, anio]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return alert('Selecciona un usuario primero');
    try {
      const payload = { usuario_id: userId, categoria: form.categoria.toLowerCase(), monto_limite: parseFloat(form.monto_limite), mes, anio };
      await api.createBudget(payload);
      setForm({ categoria: 'ALIMENTACION', monto_limite: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const getProgressClass = (percentage) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 75) return 'warning';
    return '';
  };

  const getStatusClass = (percentage) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'ok';
  };

  const getStatusText = (percentage) => {
    if (percentage >= 100) return 'Límite excedido';
    if (percentage >= 75) return 'Cerca del límite';
    return 'Dentro del límite';
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="view">
      <h2>Presupuestos - {monthNames[mes - 1]} {anio}</h2>
      {userId && (
        <form onSubmit={submit} className="simple-form">
          <label>
            Categoría
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              {categorias.map(c => <option key={c} value={c}>{categoryLabels[c.toLowerCase()] || c}</option>)}
            </select>
          </label>
          <label>
            Límite Mensual
            <input type="number" step="0.01" placeholder="0.00" value={form.monto_limite} onChange={e => setForm({ ...form, monto_limite: e.target.value })} required />
          </label>
          <button type="submit">+ Crear Presupuesto</button>
        </form>
      )}
      {loading && <p className="loading">Cargando presupuestos...</p>}
      {error && <p className="error">{error}</p>}
      <div className="dashboard-grid">
        {items.map(b => {
          const percentage = b.porcentaje_usado || 0;
          return (
            <div key={b.id} className="card">
              <div className="budget-item">
                <div className="budget-header">
                  <span className="budget-category">{categoryLabels[b.categoria?.toLowerCase()] || b.categoria}</span>
                  <span className={`budget-status ${getStatusClass(percentage)}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${getProgressClass(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="budget-amounts">
                  <strong>{formatCurrency(b.monto_gastado)}</strong> de {formatCurrency(b.monto_limite)}
                </div>
                <div className={`budget-status ${getStatusClass(percentage)}`}>
                  {getStatusText(percentage)}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && !loading && (
          <p className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
            No hay presupuestos configurados para este mes
          </p>
        )}
      </div>
    </div>
  );
}