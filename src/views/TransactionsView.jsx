import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Icon, categoryIcons } from '../components/Icon';

const tipos = ['INGRESO', 'GASTO'];
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

export default function TransactionsView({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ tipo: 'GASTO', categoria: 'ALIMENTACION', monto: '', descripcion: '' });

  const load = async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const data = await api.listTransactions({ usuario_id: userId, dias: 30 });
      console.log('💳 Transactions API response:', JSON.stringify(data, null, 2));
      console.log('📝 Sample transaction structure:', data[0] ? JSON.stringify(data[0], null, 2) : 'No transactions');
      setItems(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return alert('Selecciona un usuario primero');
    try {
      const payload = {
        usuario_id: userId,
        tipo: form.tipo.toLowerCase(),
        ...(form.tipo === 'GASTO' ? { categoria: form.categoria.toLowerCase() } : {}),
        monto: parseFloat(form.monto),
        descripcion: form.descripcion,
      };
      await api.createTransaction(payload);
      setForm({ tipo: 'GASTO', categoria: 'ALIMENTACION', monto: '', descripcion: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="view">
      <h2>Transacciones</h2>
      {userId && (
        <form onSubmit={submit} className="simple-form">
          <label>
            Tipo
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              {tipos.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          {form.tipo === 'GASTO' && (
            <label>
              Categoría
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {categorias.map(c => <option key={c}>{categoryLabels[c.toLowerCase()] || c}</option>)}
              </select>
            </label>
          )}
          <label>
            Monto
            <input type="number" step="0.01" placeholder="0.00" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} required />
          </label>
          <label>
            Descripción
            <input placeholder="Ej: Compra supermercado" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </label>
          <button type="submit">+ Agregar</button>
        </form>
      )}
      {loading && <p className="loading">Cargando transacciones...</p>}
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {items.map(t => (
          <li key={t.id}>
            <div className="transaction-item">
              <div className={`transaction-icon ${t.tipo.toLowerCase()}`}>
                <Icon 
                  name={t.tipo.toLowerCase() === 'ingreso' ? 'trendingUp' : (categoryIcons[t.categoria?.toLowerCase()] || 'dollarSign')} 
                  size={20} 
                />
              </div>
              <div className="transaction-details">
                <strong>{t.descripcion || (t.tipo === 'INGRESO' ? 'Ingreso' : categoryLabels[t.categoria?.toLowerCase()])}</strong>
                <small>{formatDate(t.fecha)}</small>
              </div>
              <div className={`transaction-amount ${t.tipo.toLowerCase()}`}>
                {t.tipo.toLowerCase() === 'ingreso' ? '+' : '-'}{formatCurrency(t.monto)}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && !loading && (
          <p className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
            No hay transacciones registradas en los últimos 30 días
          </p>
        )}
      </ul>
    </div>
  );
}