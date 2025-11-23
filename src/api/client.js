// Simple API client with JWT support
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

function withAuth(headers = {}) {
  const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const baseHeaders = options.noDefaultJson
    ? { ...(options.headers || {}) }
    : { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const headers = options.skipAuth ? baseHeaders : withAuth(baseHeaders);
  const config = { ...options, headers };
  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.error('API request error', err);
    throw err;
  }
}

export const api = {
  // Auth token helpers
  setToken(token) {
    authToken = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('authToken', token);
      else localStorage.removeItem('authToken');
    }
  },
  getToken() {
    return authToken || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
  },

  // AUTH
  authRegister: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  }),
  authLogin: async ({ email, password }) => {
    const body = new URLSearchParams({ username: email, password });
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      skipAuth: true,
      noDefaultJson: true,
    });
    return res;
  },
  authMe: () => request('/auth/me', { method: 'GET' }),

  // USERS (may be public in backend; keep without protection if needed)
  listUsers: () => request('/usuarios', { skipAuth: true }),
  createUser: (data) => request('/usuarios', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),

  // TRANSACTIONS
  listTransactions: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return request(`/transacciones${params ? `?${params}` : ''}`);
  },
  createTransaction: (data) => request('/transacciones', { method: 'POST', body: JSON.stringify(data) }),

  // BUDGETS
  listBudgets: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return request(`/presupuestos${params ? `?${params}` : ''}`);
  },
  createBudget: (data) => request('/presupuestos', { method: 'POST', body: JSON.stringify(data) }),

  // ALERTS
  listAlerts: async (query = {}) => {
    const params = new URLSearchParams(query).toString();
    const path = `/alertas${params ? `?${params}` : ''}`;
    const res = await request(path);
    if (import.meta?.env?.DEV) {
      console.log('[API] GET', path, { query, response: res });
    }
    return res;
  },
  markAlertRead: (id) => request(`/alertas/${id}/marcar-leida`, { method: 'PATCH' }),

  // DASHBOARD
  getDashboard: (usuarioId) => request(`/dashboard/${usuarioId}`),

  // SYSTEM
  getRoot: () => request('/', { skipAuth: true }),
  getHealth: () => request('/health', { skipAuth: true }),
  getMonitorStatus: () => request('/monitor/status', { skipAuth: true }),

  // ANALYTICS
  analysisBalance: (usuario_id, periodo_dias = 30) => request('/analisis/balance', { method: 'POST', body: JSON.stringify({ usuario_id, periodo_dias }) }),
  analysisBudgets: (usuario_id, periodo_dias = 30) => request('/analisis/presupuestos', { method: 'POST', body: JSON.stringify({ usuario_id, periodo_dias }) }),
  analysisComplete: (usuario_id, periodo_dias = 30) => request('/analisis/completo', { method: 'POST', body: JSON.stringify({ usuario_id, periodo_dias }) }),
  recommendations: (usuario_id, objetivo = 'optimizar_gastos') => request('/recomendaciones', { method: 'POST', body: JSON.stringify({ usuario_id, objetivo }) }),
};

export default api;