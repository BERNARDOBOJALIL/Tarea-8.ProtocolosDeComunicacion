import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function LoginSelector({ onLogin }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    nombre: '',
    email: '',
    password: '',
    ingreso_mensual: '',
    objetivo_ahorro: ''
  });

  useEffect(() => {
    // Intentar restaurar sesión si hay token guardado
    const token = api.getToken();
    if (token) {
      (async () => {
        try {
          setLoading(true);
          const me = await api.authMe();
          if (me?.id) onLogin(me);
        } catch (e) {
          // token inválido: limpiarlo
          api.setToken(null);
        } finally { setLoading(false); }
      })();
    }
  }, [onLogin]);

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.authLogin({ email: loginForm.email, password: loginForm.password });
      if (!res?.access_token) throw new Error('Login inválido');
      api.setToken(res.access_token);
      const me = await api.authMe();
      if (!me?.id) throw new Error('No se pudo obtener el perfil');
      onLogin(me);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        nombre: registerForm.nombre,
        email: registerForm.email,
        password: registerForm.password,
        ingreso_mensual: parseFloat(registerForm.ingreso_mensual),
        objetivo_ahorro: parseFloat(registerForm.objetivo_ahorro)
      };
      await api.authRegister(payload);
      // Autologin
      const res = await api.authLogin({ email: registerForm.email, password: registerForm.password });
      api.setToken(res.access_token);
      const me = await api.authMe();
      onLogin(me);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const parseApiError = (e) => {
    const msg = e?.message || 'Error inesperado';
    if (msg.includes('401')) return 'Credenciales inválidas';
    if (msg.includes('409')) return 'El email ya está registrado';
    if (msg.includes('422')) return 'Datos inválidos';
    return msg;
  };

  return (
    <div className="login-container minimal-bg">
      <div className="login-card minimal">
        <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '0.75rem' }}>Finanzas Personales</h1>
        <p className="subtitle" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>Accede o crea tu cuenta</p>

        <div style={{ display: 'flex', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
          <button
            className="btn-secondary minimal-tab"
            style={{ flex: 1, background: tab === 'login' ? '#f1f5f9' : '#ffffff', borderColor: tab === 'login' ? '#cbd5e1' : 'var(--border)' }}
            onClick={() => { setTab('login'); setError(null); }}
            disabled={loading}
          >
            Iniciar sesión
          </button>
          <button
            className="btn-secondary minimal-tab"
            style={{ flex: 1, background: tab === 'register' ? '#f1f5f9' : '#ffffff', borderColor: tab === 'register' ? '#cbd5e1' : 'var(--border)' }}
            onClick={() => { setTab('register'); setError(null); }}
            disabled={loading}
          >
            Crear cuenta
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {tab === 'login' ? (
          <form onSubmit={handleSubmitLogin} className="user-selector minimal-login-form">
            <label htmlFor="email">
              Email
              <input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <label htmlFor="password">
              Contraseña
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitRegister} className="user-selector minimal-login-form">
            <h3 style={{ margin: '0 0 1rem 0' }}>Crear Nuevo Usuario</h3>
            <label htmlFor="nombre">
              Nombre completo
              <input
                id="nombre"
                type="text"
                placeholder="Ej: Juan Pérez"
                value={registerForm.nombre}
                onChange={(e) => setRegisterForm({ ...registerForm, nombre: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <label htmlFor="email_reg">
              Email
              <input
                id="email_reg"
                type="email"
                placeholder="correo@ejemplo.com"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <label htmlFor="password_reg">
              Contraseña
              <input
                id="password_reg"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
                minLength={6}
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <label htmlFor="ingreso">
              Ingreso mensual
              <input
                id="ingreso"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={registerForm.ingreso_mensual}
                onChange={(e) => setRegisterForm({ ...registerForm, ingreso_mensual: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <label htmlFor="objetivo">
              Objetivo de ahorro mensual
              <input
                id="objetivo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={registerForm.objetivo_ahorro}
                onChange={(e) => setRegisterForm({ ...registerForm, objetivo_ahorro: e.target.value })}
                required
                style={{ marginTop: '0.5rem' }}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creando...' : '✅ Crear y acceder'}
            </button>
          </form>
        )}

        <p className="mt-2 text-center" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Autenticación JWT habilitada
        </p>
      </div>
    </div>
  );
}
