import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function DashboardView({ userId, userName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [derived, setDerived] = useState(null); // fallback desde análisis
  const [derivedLoading, setDerivedLoading] = useState(false);
  const [computed, setComputed] = useState(null); // métricas calculadas en front
  const [computedLoading, setComputedLoading] = useState(false);
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);


  const load = async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const res = await api.getDashboard(userId);
      console.log('🔍 Raw dashboard API response:', JSON.stringify(res, null, 2));
      // Estructuras soportadas: AGUI ui_data.dashboard, data, dashboard plano
      const uiData = res?.dashboard?.ui_data?.dashboard;
      const aguiData = res?.dashboard?.data;
      const directData = res?.data;
      const fallback = res?.dashboard || res;
      const dashboardData = uiData || aguiData || directData || fallback || null;
      console.log('📊 Extracted dashboard data:', JSON.stringify(dashboardData, null, 2));
      console.log('💰 resumen_financiero:', JSON.stringify(dashboardData?.resumen_financiero, null, 2));
      setData(dashboardData);
      // Intentar derivar métricas si el resumen viene vacío pero hay actividad
      maybeLoadDerived(dashboardData);
      // Calcular métricas clave desde el frontend para mayor robustez
      computeFrontStats(dashboardData);
      // Asegurar datos de usuario si el dashboard no los trae
      ensureUserInfo(dashboardData);
      // Recomendaciones de IA si el dashboard no las incluye
      ensureRecommendations(dashboardData);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const ensureRecommendations = async (d) => {
    try {
      // Si el dashboard ya trae recomendaciones, usamos esas
      if (Array.isArray(d?.recomendaciones_principales) && d.recomendaciones_principales.length > 0) {
        setRecs([]);
        return;
      }
      setRecsLoading(true);
      let items = [];

      // 1) Intentar desde análisis de balance (variantes de estructura)
      try {
        const analysis = await api.analysisBalance(userId, 30);
        const resultado = analysis?.analisis?.resultado || analysis?.resultado || analysis?.data || analysis || null;
        const candidates = [
          resultado?.analisis_ia?.recomendaciones,
          resultado?.recomendaciones,
          analysis?.recomendaciones,
          analysis?.analisis?.recomendaciones,
        ].filter(Array.isArray);
        if (candidates.length) items = candidates.flat();
      } catch (e) {
        console.warn('Balance analysis recs falló:', e.message);
      }

      // 2) Endpoint /recomendaciones si seguimos vacíos
      if (!items.length) {
        try {
          const recResp = await api.recommendations(userId, 'optimizar_gastos');
          const candidates2 = [
            recResp?.recomendaciones,
            recResp?.data?.recomendaciones,
            recResp?.resultado?.recomendaciones,
            recResp?.recomendaciones_principales,
            recResp?.insights?.recomendaciones,
            recResp?.insights?.sugerencias,
            recResp?.insights?.insights?.insights,
            recResp?.insights?.insights?.sugerencias,
          ].filter(Array.isArray);
          if (candidates2.length) items = candidates2.flat();
        } catch (e) {
          console.warn('Endpoint /recomendaciones falló:', e.message);
        }
      }

      // Normalización: objetos → texto legible si existe, limpiar vacíos y duplicados
      const normalized = (items || []).map(r => {
        if (typeof r === 'string') return r.trim();
        if (!r || typeof r !== 'object') return null;
        const txt = r.descripcion || r.texto || r.titulo || r.mensaje || null;
        return txt ? String(txt).trim() : JSON.stringify(r);
      }).filter(Boolean);
      const unique = Array.from(new Set(normalized));
      setRecs(unique.slice(0, 5));
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const maybeLoadDerived = async (d) => {
    // Cálculo 100% desde el frontend usando transacciones del mes actual
    try {
      setDerivedLoading(true);
      console.log('🔎 Calculando resumen desde transacciones (frontend)...');
      const txAll = await api.listTransactions({ usuario_id: userId, dias: 90 });
      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      const inCurrentMonth = (tx) => {
        const d = new Date(tx.fecha);
        return d.getMonth() === m && d.getFullYear() === y;
      };
      const toNumber = (v) => {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return Number.isFinite(n) ? n : 0;
      };
      const sum = (arr) => arr.reduce((acc, t) => acc + toNumber(t.monto), 0);

      const txMonth = (txAll || []).filter(inCurrentMonth);
      const gastosMes = sum(txMonth.filter(t => (t.tipo || '').toUpperCase() === 'GASTO'));
      const ingresosMes = sum(txMonth.filter(t => (t.tipo || '').toUpperCase() === 'INGRESO'));

      const derivedFromTx = {
        gastos_totales_mes_actual: gastosMes,
        ahorros_totales: Math.max(ingresosMes - gastosMes, 0),
        patrimonio_neto: ingresosMes - gastosMes,
        source: 'front',
      };
      console.log('✅ Resumen calculado (frontend):', derivedFromTx);
      setDerived(derivedFromTx);
    } catch (e) {
      console.error('❌ Error calculando resumen en el frontend:', e);
    } finally {
      setDerivedLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const computeFrontStats = async (d) => {
    try {
      setComputedLoading(true);
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const monthIndexApi = month + 1;
      const [tx30, budgets, alerts, tx90] = await Promise.all([
        api.listTransactions({ usuario_id: userId, dias: 30 }),
        api.listBudgets({ usuario_id: userId, mes: monthIndexApi, anio: year }),
        api.listAlerts({ usuario_id: userId, estado: 'pendiente' }),
        api.listTransactions({ usuario_id: userId, dias: 90 })
      ]);
      const inCurrentMonth = (tx) => {
        try { const d = new Date(tx.fecha); return d.getMonth() === month && d.getFullYear() === year; } catch { return false; }
      };
      const toNumber = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(n) ? n : 0; };
      const sum = (arr) => arr.reduce((acc, t) => acc + toNumber(t.monto), 0);

      const txMonth = (tx90 || []).filter(inCurrentMonth);
      const ingresosMes = sum(txMonth.filter(t => (t.tipo || '').toUpperCase() === 'INGRESO'));

      setComputed({
        ingresoMensual: d?.usuario?.ingreso_mensual ?? d?.ingreso_mensual ?? userInfo?.ingreso_mensual ?? ingresosMes,
        tx30: Array.isArray(tx30) ? tx30.length : 0,
        budgetsCount: Array.isArray(budgets) ? budgets.length : 0,
        alertsPending: Array.isArray(alerts) ? alerts.length : 0,
      });
    } catch (e) {
      console.warn('computeFrontStats failed', e);
      setComputed(null);
      setError(prev => prev || (e?.message || 'Error al obtener métricas'));
    } finally {
      setComputedLoading(false);
    }
  };

  const ensureUserInfo = async (d) => {
    try {
      const hasUsuario = !!(d?.usuario?.nombre || d?.usuario?.email || d?.usuario?.objetivo_ahorro);
      if (hasUsuario) { setUserInfo(d.usuario); return; }
      setUserInfoLoading(true);
      const users = await api.listUsers().catch(() => []);
      const u = Array.isArray(users) ? users.find(x => x.id === userId) : null;
      if (u) setUserInfo(u);
    } catch (e) {
      console.warn('ensureUserInfo failed', e);
    } finally {
      setUserInfoLoading(false);
    }
  };


  if (!userId) {
    return (
      <div className="view">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
          <h3>Bienvenido</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Selecciona un usuario para comenzar a gestionar tus finanzas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Dashboard</h2>
        <button className="btn-secondary" onClick={load}>Refrescar</button>
      </div>

      {loading && <p className="loading">Cargando datos...</p>}
      {error && <p className="error">{error}</p>}
      
      {data ? (
        <>
          <div className="dashboard-grid">
            <div className="card stat-card">
              <div className="stat-label">Ingreso Mensual</div>
              <div className="stat-value" style={{ color: 'var(--secondary)' }}>
                {formatCurrency(
                  computed?.ingresoMensual
                  ?? data.usuario?.ingreso_mensual
                  ?? data.resumen_financiero?.ingreso_mensual
                  ?? data.ingreso_mensual
                  ?? 0
                )}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Transacciones (30 días)</div>
              <div className="stat-value">{
                computed?.tx30
                ?? data.transacciones_recientes
                ?? data.tendencias_recientes?.transacciones_recientes
                ?? data.transacciones
                ?? 0
              }</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Presupuestos Activos</div>
              <div className="stat-value">{
                computed?.budgetsCount
                ?? data.presupuestos_activos
                ?? data.estado_presupuestos?.presupuestos_activos
                ?? data.presupuestos
                ?? 0
              }</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Alertas Pendientes</div>
              <div className="stat-value" style={{ color: (
                (data.alertas_pendientes
                  ?? data.alertas_activas?.numero_alertas
                  ?? 0) > 0
              ) ? 'var(--warning)' : 'var(--secondary)' }}>
                {computed?.alertsPending ?? data.alertas_pendientes ?? data.alertas_activas?.numero_alertas ?? 0}
              </div>
            </div>
          </div>

          {/* Resumen financiero adicional si existe */}
          {(data.resumen_financiero || derived || data.estado_presupuestos || data.tendencias_recientes) && (
            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
              {(data.resumen_financiero || derived) && (
                <div className="card">
                  <h3>Resumen financiero</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div className="stat-label">Gastos del mes</div>
                      <div className="stat-value" style={{ color: 'var(--danger)', fontSize: '1.5rem' }}>
                        {formatCurrency((derived?.gastos_totales_mes_actual) ?? (data.resumen_financiero?.gastos_totales_mes_actual ?? 0))}
                      </div>
                      
                    </div>
                    <div>
                      <div className="stat-label">Ahorros totales</div>
                      <div className="stat-value" style={{ color: 'var(--secondary)', fontSize: '1.5rem' }}>
                        {formatCurrency((derived?.ahorros_totales) ?? (data.resumen_financiero?.ahorros_totales ?? 0))}
                      </div>
                      
                    </div>
                    <div>
                      <div className="stat-label">Patrimonio neto</div>
                      <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>
                        {formatCurrency((derived?.patrimonio_neto) ?? (data.resumen_financiero?.patrimonio_neto ?? 0))}
                      </div>
                      
                    </div>
                  </div>
                  {derivedLoading && <p className="loading">Calculando estimados...</p>}
                </div>
              )}

              {(data.recomendaciones_principales && data.recomendaciones_principales.length > 0) ? (
                <div className="card">
                  <h3>Recomendaciones</h3>
                  <ul className="list">
                    {data.recomendaciones_principales.slice(0,5).map((r, idx) => (
                      <li key={idx}>
                        <div>
                          <strong>{r.titulo || 'Recomendación'}</strong>
                          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{r.descripcion || ''}</p>
                        </div>
                        {r.prioridad && <span className="btn-secondary">{r.prioridad}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="card">
                  <h3>Recomendaciones</h3>
                  {recsLoading ? (
                    <p className="loading">Cargando recomendaciones...</p>
                  ) : (
                    <ul className="list">
                      {(recs || []).slice(0,5).map((txt, idx) => (
                        <li key={idx}>
                          <div>
                            <p style={{ margin: 0 }}>{typeof txt === 'string' ? txt : JSON.stringify(txt)}</p>
                          </div>
                        </li>
                      ))}
                      {(!recs || recs.length === 0) && (
                        <li>
                          <div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Sin recomendaciones por ahora</p>
                          </div>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3>Información del Usuario</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nombre</div>
                <div style={{ fontWeight: '600' }}>{userInfo?.nombre || data.usuario?.nombre || data.nombre || '-'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email</div>
                <div style={{ fontWeight: '600' }}>{userInfo?.email || data.usuario?.email || data.email || '-'}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <h3>No hay datos para mostrar</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Aún no hay información registrada para este usuario.
          </p>
        </div>
      )}
    </div>
  );
}