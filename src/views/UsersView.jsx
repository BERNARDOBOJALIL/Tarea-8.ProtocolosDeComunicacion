import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function UsersView({ onSelectUser, selectedUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', ingreso_mensual: '', objetivo_ahorro: '' });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, ingreso_mensual: parseFloat(form.ingreso_mensual), objetivo_ahorro: parseFloat(form.objetivo_ahorro) };
      await api.createUser(payload);
      setForm({ nombre: '', email: '', ingreso_mensual: '', objetivo_ahorro: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="view">
      <h2>Usuarios</h2>
      <form onSubmit={submit} className="simple-form">
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Ingreso mensual" value={form.ingreso_mensual} onChange={e => setForm({ ...form, ingreso_mensual: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Objetivo ahorro" value={form.objetivo_ahorro} onChange={e => setForm({ ...form, objetivo_ahorro: e.target.value })} required />
        <button type="submit">Crear Usuario</button>
      </form>
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {users.map(u => (
          <li key={u.id} className={selectedUserId === u.id ? 'selected' : ''}>
            <button onClick={() => onSelectUser(u.id)}>
              {u.nombre} ({u.email})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}