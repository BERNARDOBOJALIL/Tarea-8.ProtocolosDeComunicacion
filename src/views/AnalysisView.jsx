import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import api from '../api/client';

// Vista reimaginada: un solo botón que llama al endpoint externo de balance
// Se extraen únicamente los campos solicitados del JSON: status, message_id, protocol,
// content_type, ingresos_totales, gastos_totales, balance, total_transacciones,
// gastos_por_categoria, ingreso_mensual, timestamp y recomendaciones_principales.

export default function AnalysisView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [dias, setDias] = useState(30);
  // Estados para presupuestos
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState(null);
  const [budgetsData, setBudgetsData] = useState(null);
  const [showBudgetsRaw, setShowBudgetsRaw] = useState(false);
  // Estados para proceso completo
  const [processLoading, setProcessLoading] = useState(false);
  const [processError, setProcessError] = useState(null);
  const [processData, setProcessData] = useState(null);
  const [showProcessRaw, setShowProcessRaw] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);

  const ENDPOINT = 'https://api-multiagente.onrender.com/analisis/balance';
  const BUDGETS_ENDPOINT = 'https://api-multiagente.onrender.com/analisis/presupuestos';
  const COMPLETE_ENDPOINT = 'https://api-multiagente.onrender.com/analisis/completo';

  const doFetch = async () => {
    if (!usuarioId) { setError('No autenticado: inicia sesión primero'); return; }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const token = api.getToken();
      const bodyPayload = { usuario_id: Number(usuarioId), periodo_dias: Number(dias) };
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(bodyPayload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt.slice(0,180)}`);
      }
      const json = await res.json();
      setData(extract(json));
    } catch (e) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const extract = (root) => {
    if (!root || typeof root !== 'object') return null;

    // Buscar objectos de interés dentro de task_results si existen
    let mcpHistorical = null;
    let mcpDirect = root?.response; // si viene directamente
    const taskResults = root?.plan?.task_results || root?.task_results || [];
    if (Array.isArray(taskResults)) {
      for (const tr of taskResults) {
        const r = tr?.response;
        // historical analysis tipo MCP
        if (r?.result?.content_type === 'historical_analysis') {
          mcpHistorical = r;
        }
        // balance calculado ACP podría tener campo resultado plano
        if (!mcpDirect && r?.result) mcpDirect = r; // fallback
      }
    }

    const source = mcpHistorical || mcpDirect || null;
    const result = source?.result || {};
    const dataBlock = result?.data || source?.resultado || {};
    // Buscar recomendaciones_principales en múltiples rutas conocidas
    let recomendacionesPrincipales = root?.recomendaciones_principales
      || root?.dashboard?.recomendaciones_principales
      || root?.data?.recomendaciones_principales
      || root?.ui_data?.dashboard?.recomendaciones_principales
      || null;
    if (!recomendacionesPrincipales && Array.isArray(taskResults)) {
      for (const tr of taskResults) {
        const r = tr?.response;
        const cand = r?.ui_data?.dashboard?.recomendaciones_principales
          || r?.dashboard?.recomendaciones_principales
          || r?.data?.recomendaciones_principales
          || null;
        if (cand) { recomendacionesPrincipales = cand; break; }
      }
    }
    // Búsqueda profunda genérica si aún no se encuentra
    if (!recomendacionesPrincipales) {
      const deepSearch = (obj, depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 8) return null;
        if (obj.recomendaciones_principales && Array.isArray(obj.recomendaciones_principales.recomendaciones)) return obj.recomendaciones_principales;
        for (const k of Object.keys(obj)) {
          const found = deepSearch(obj[k], depth + 1);
          if (found) return found;
        }
        return null;
      };
      recomendacionesPrincipales = deepSearch(root);
    }
    if (import.meta?.env?.DEV) {
      console.log('[AnalysisView] recomendacionesPrincipales extraído:', recomendacionesPrincipales);
    }

    // Extraer analisis_ia (evaluacion_general, puntos_criticos, recomendaciones, tendencia)
    let analisisIA = root?.analisis_ia
      || result?.analisis_ia
      || dataBlock?.analisis_ia
      || source?.analisis_ia
      || null;
    if (!analisisIA && Array.isArray(taskResults)) {
      for (const tr of taskResults) {
        const cand = tr?.response?.analisis_ia || tr?.response?.resultado?.analisis_ia || null;
        if (cand) { analisisIA = cand; break; }
      }
    }
    if (!analisisIA) {
      const deepSearchIA = (obj, depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 10) return null;
        if (obj.analisis_ia && (obj.analisis_ia.evaluacion_general || obj.analisis_ia.puntos_criticos)) return obj.analisis_ia;
        for (const k of Object.keys(obj)) {
          const found = deepSearchIA(obj[k], depth + 1);
          if (found) return found;
        }
        return null;
      };
      analisisIA = deepSearchIA(root);
    }
    if (import.meta?.env?.DEV) {
      console.log('[AnalysisView] analisisIA extraído:', analisisIA);
    }

    return {
      status: source?.status || root?.status || null,
      message_id: result?.message_id || null,
      protocol: result?.protocol || source?.protocol_used || root?.protocol_used || null,
      content_type: result?.content_type || null,
      timestamp: result?.timestamp || null,
      ingresos_totales: dataBlock?.ingresos_totales ?? null,
      gastos_totales: dataBlock?.gastos_totales ?? null,
      balance: dataBlock?.balance ?? null,
      total_transacciones: dataBlock?.total_transacciones ?? null,
      gastos_por_categoria: dataBlock?.gastos_por_categoria || {},
      ingreso_mensual: dataBlock?.ingreso_mensual ?? null,
      recomendaciones_titulo: recomendacionesPrincipales?.titulo || null,
      recomendaciones: Array.isArray(recomendacionesPrincipales?.recomendaciones) ? recomendacionesPrincipales.recomendaciones : [] ,
      recomendaciones_principales: recomendacionesPrincipales || null,
      analisis_ia: analisisIA || null,
      raw: root
    };
  };

  // Extracción específica para presupuestos
  const extractPresupuestos = (root) => {
    if (!root || typeof root !== 'object') return null;
    const taskResults = root?.plan?.task_results || root?.task_results || [];
    let budgetsNode = null;
    let sourceMeta = null;
    if (Array.isArray(taskResults)) {
      for (const tr of taskResults) {
        const resp = tr?.response;
        if (resp?.status === 'budgets_verified' && (resp?.resultado || resp?.result)) {
          budgetsNode = resp.resultado || resp.result;
          sourceMeta = resp;
          break;
        }
      }
    }
    if (!budgetsNode && root?.response?.status === 'budgets_verified') {
      budgetsNode = root.response.resultado || root.response.result || null;
      sourceMeta = root.response;
    }
    const presupuestos = Array.isArray(budgetsNode?.presupuestos) ? budgetsNode.presupuestos : [];
    let analisisIA = budgetsNode?.analisis_ia || null;
    const recomendaciones = Array.isArray(budgetsNode?.recomendaciones) ? budgetsNode.recomendaciones : [];
    if (!analisisIA) {
      const deepSearch = (obj, depth=0) => {
        if (!obj || typeof obj !== 'object' || depth > 8) return null;
        if (obj.analisis_ia) return obj.analisis_ia;
        for (const k of Object.keys(obj)) {
          const found = deepSearch(obj[k], depth+1);
          if (found) return found;
        }
        return null;
      };
      analisisIA = deepSearch(root);
    }
    return {
      presupuestos,
      analisis_ia: analisisIA,
      recomendaciones,
      status: sourceMeta?.status || root?.status || null,
      protocol: sourceMeta?.protocol_used || root?.protocol_used || null,
      timestamp: sourceMeta?.result?.timestamp || sourceMeta?.timestamp || null,
      message_id: sourceMeta?.result?.message_id || null,
      raw: root
    };
  };

  const doFetchPresupuestos = async () => {
    if (!usuarioId) { setBudgetsError('No autenticado: inicia sesión primero'); return; }
    setBudgetsLoading(true);
    setBudgetsError(null);
    setBudgetsData(null);
    try {
      const token = api.getToken();
      const res = await fetch(BUDGETS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ usuario_id: Number(usuarioId), periodo_dias: Number(dias) })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt.slice(0,180)}`);
      }
      const json = await res.json();
      setBudgetsData(extractPresupuestos(json));
    } catch (e) {
      setBudgetsError(e.message || 'Error desconocido');
    } finally {
      setBudgetsLoading(false);
    }
  };

  // Extracción para análisis completo: subtareas + task_results
  const extractProceso = (root) => {
    if (!root || typeof root !== 'object') return null;
    const subtareas = root?.plan?.plan?.subtareas || root?.plan?.subtareas || [];
    const taskResults = root?.plan?.task_results || root?.task_results || [];
    const tareasEjecutadas = Array.isArray(taskResults) ? taskResults.map(tr => {
      const tarea = tr?.tarea || {};
      const resp = tr?.response || {};
      return {
        id: tarea.id || null,
        tipo: tarea.tipo || null,
        agente: tarea.agente || null,
        prioridad: tarea.prioridad || null,
        status: resp.status || null,
        protocol_used: resp.protocol_used || null,
        mensaje_alerta: resp.alerta?.mensaje || null,
        resumen_ui: resp.ui_data?.resumen || null,
        health: resp.health || null
      };
    }) : [];
    return {
      estrategia: root?.plan?.plan?.estrategia || null,
      subtareas: Array.isArray(subtareas) ? subtareas : [],
      tareas_ejecutadas: tareasEjecutadas,
      status: root?.status || null,
      protocol: root?.protocol_used || null,
      raw: root
    };
  };

  const doFetchProceso = async () => {
    if (!usuarioId) { setProcessError('No autenticado: inicia sesión primero'); return; }
    setProcessLoading(true);
    setProcessError(null);
    setProcessData(null);
    try {
      const token = api.getToken();
      const res = await fetch(COMPLETE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ usuario_id: Number(usuarioId), periodo_dias: Number(dias) })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt.slice(0,180)}`);
      }
      const json = await res.json();
      setProcessData(extractProceso(json));
    } catch (e) {
      setProcessError(e.message || 'Error desconocido');
    } finally {
      setProcessLoading(false);
    }
  };

  const formatCurrency = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
  };

  // Obtener usuario autenticado al montar (si hay token)
  useEffect(() => {
    const token = api.getToken();
    if (!token) { setUserLoading(false); setUserError('No hay sesión activa'); return; }
    (async () => {
      try {
        setUserLoading(true);
        const me = await api.authMe();
        if (me?.id) setUsuarioId(me.id);
        else setUserError('No se pudo obtener usuario');
      } catch (e) {
        setUserError('Error al obtener usuario');
      } finally {
        setUserLoading(false);
      }
    })();
  }, []);

  return (
    <div className="view">
      <h2>Análisis Financiero</h2>
      
      {/* Panel de Control */}
      <div className="card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'1.25rem', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <label style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)' }}>Periodo</label>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <input
                  type="number"
                  value={dias}
                  min={1}
                  max={365}
                  onChange={e=>setDias(e.target.value)}
                  style={{
                    width:90,
                    padding:'0.65rem 0.75rem',
                    fontSize:'0.875rem',
                    fontWeight:500,
                    border:'2px solid var(--border)',
                    borderRadius:'8px',
                    background:'var(--background)',
                    color:'var(--text-primary)',
                    outline:'none',
                    transition:'all 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                <span style={{ fontSize:'0.875rem', color:'var(--text-secondary)', fontWeight:500 }}>días</span>
              </div>
            </div>
          </div>
          
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            <button
              onClick={doFetch}
              disabled={loading || userLoading || !usuarioId}
              className="btn"
              style={{
                padding:'0.75rem 1.5rem',
                fontSize:'0.875rem',
                fontWeight:600,
                borderRadius:'8px',
                background: loading ? 'var(--surface-2)' : 'var(--primary)',
                color: '#fff',
                border:'none',
                cursor: loading || userLoading || !usuarioId ? 'not-allowed' : 'pointer',
                opacity: loading || userLoading || !usuarioId ? 0.6 : 1,
                display:'flex',
                alignItems:'center',
                gap:'0.5rem',
                transition:'all 0.2s',
                boxShadow:'0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => { if(!loading && !userLoading && usuarioId) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Icon name="trending-up" size={18} />
              {loading ? 'Analizando...' : 'Análisis Balance'}
            </button>
            
            <button
              onClick={doFetchPresupuestos}
              disabled={budgetsLoading || userLoading || !usuarioId}
              className="btn-secondary"
              style={{
                padding:'0.75rem 1.5rem',
                fontSize:'0.875rem',
                fontWeight:600,
                borderRadius:'8px',
                background: budgetsLoading ? 'var(--surface-2)' : 'var(--background)',
                color: 'var(--text-primary)',
                border:'2px solid var(--border)',
                cursor: budgetsLoading || userLoading || !usuarioId ? 'not-allowed' : 'pointer',
                opacity: budgetsLoading || userLoading || !usuarioId ? 0.6 : 1,
                display:'flex',
                alignItems:'center',
                gap:'0.5rem',
                transition:'all 0.2s'
              }}
              onMouseEnter={e => { if(!budgetsLoading && !userLoading && usuarioId) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Icon name="list" size={18} />
              {budgetsLoading ? 'Analizando...' : 'Presupuestos'}
            </button>
            
            <button
              onClick={() => { doFetchProceso(); setShowProcessModal(true); }}
              disabled={processLoading || userLoading || !usuarioId}
              title="Ver proceso completo (plan y ejecución)"
              className="btn-secondary"
              style={{
                padding:'0.75rem 1rem',
                fontSize:'0.875rem',
                fontWeight:600,
                borderRadius:'8px',
                background: processLoading ? 'var(--surface-2)' : 'var(--background)',
                color: 'var(--text-primary)',
                border:'2px solid var(--border)',
                cursor: processLoading || userLoading || !usuarioId ? 'not-allowed' : 'pointer',
                opacity: processLoading || userLoading || !usuarioId ? 0.6 : 1,
                display:'flex',
                alignItems:'center',
                gap:'0.5rem',
                transition:'all 0.2s'
              }}
              onMouseEnter={e => { if(!processLoading && !userLoading && usuarioId) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Icon name="layers" size={18} />
              {processLoading ? 'Cargando...' : 'Proceso Completo'}
            </button>
          </div>
        </div>
      </div>
      
      {error && <p className="error" style={{ marginBottom:'1rem' }}>{error}</p>}
      {budgetsError && <p className="error" style={{ marginBottom:'1rem' }}>{budgetsError}</p>}
      {processError && <p className="error" style={{ marginBottom:'1rem' }}>{processError}</p>}
      
      {/* Resultados */}
      <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
        {/* Balance */}
        {data && (
          <div className="card" style={{ padding:'1.5rem', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Icon name="trending-up" size={20} style={{ color:'var(--primary)' }} />
                Análisis de Balance
              </h3>
              <button
                onClick={()=>setShowRaw(s=>!s)}
                style={{
                  padding:'0.4rem 0.7rem',
                  fontSize:'0.7rem',
                  border:'1px solid var(--border)',
                  borderRadius:'6px',
                  background:'var(--surface)',
                  color:'var(--text-secondary)',
                  cursor:'pointer',
                  transition:'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                {showRaw ? 'Ocultar' : 'Ver'} JSON
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span className={`budget-status ${data.balance >= 0 ? 'ok' : 'danger'}`} style={{ fontSize:'0.7rem' }}>
                  {data.balance >= 0 ? 'Balance Positivo' : 'Balance Negativo'}
                </span>
              </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
              <div className="card stat-card" style={{ padding:'0.75rem' }}>
                <div className="stat-label">Ingresos Totales</div>
                <div className="stat-value" style={{ fontSize:'1.1rem' }}>{formatCurrency(data.ingresos_totales)}</div>
              </div>
              <div className="card stat-card" style={{ padding:'0.75rem' }}>
                <div className="stat-label">Gastos Totales</div>
                <div className="stat-value" style={{ fontSize:'1.1rem', color:'var(--danger)' }}>{formatCurrency(data.gastos_totales)}</div>
              </div>
              <div className="card stat-card" style={{ padding:'0.75rem' }}>
                <div className="stat-label">Balance</div>
                <div className="stat-value" style={{ fontSize:'1.1rem', color: data.balance >=0 ? 'var(--secondary)' : 'var(--danger)' }}>{formatCurrency(data.balance)}</div>
              </div>
              <div className="card stat-card" style={{ padding:'0.75rem' }}>
                <div className="stat-label">Transacciones</div>
                <div className="stat-value" style={{ fontSize:'1.1rem' }}>{data.total_transacciones ?? '—'}</div>
              </div>
              <div className="card stat-card" style={{ padding:'0.75rem' }}>
                <div className="stat-label">Ingreso Mensual</div>
                <div className="stat-value" style={{ fontSize:'1.1rem' }}>{formatCurrency(data.ingreso_mensual)}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginTop:'0.5rem' }}>
              <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)' }}>status: <strong>{data.status || '—'}</strong></div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)' }}>protocol: <strong>{data.protocol || '—'}</strong> / content_type: <strong>{data.content_type || '—'}</strong></div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)' }}>message_id: <strong>{data.message_id || '—'}</strong></div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)' }}>timestamp: <strong>{data.timestamp || '—'}</strong></div>
            </div>
          </div>
          {data.gastos_por_categoria && Object.keys(data.gastos_por_categoria).length > 0 && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <h3 style={{ margin:'0 0 1rem 0' }}>Gastos por Categoría</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {Object.entries(data.gastos_por_categoria).map(([cat,val])=>{
                  const porcentaje = data.gastos_totales ? ((val / data.gastos_totales) * 100) : 0;
                  return (
                    <div key={cat} style={{ display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.75rem' }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--primary)' }} />
                      <span style={{ flex:1, textTransform:'capitalize' }}>{cat}</span>
                      <strong>{formatCurrency(val)}</strong>
                      <span style={{ color:'var(--text-tertiary)' }}>{porcentaje.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {data.recomendaciones_principales && data.recomendaciones_principales.recomendaciones && data.recomendaciones_principales.recomendaciones.length > 0 && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <h3 style={{ margin:'0 0 1rem 0' }}>{data.recomendaciones_principales.titulo || 'Recomendaciones Principales'}</h3>
              <ol style={{ margin:0, paddingLeft:'1.1rem', display:'flex', flexDirection:'column', gap:'0.55rem', fontSize:'0.75rem' }}>
                {data.recomendaciones_principales.recomendaciones.map((item,i)=>{
                  // Si es string, mostrar directamente
                  if (typeof item === 'string') {
                    return (
                      <li key={i} style={{ lineHeight:1.35, color:'var(--text-secondary)' }}>{item}</li>
                    );
                  }
                  // Si es objeto, extraer campos conocidos
                  const texto = item.descripcion || item.texto || item.recomendacion || item.mensaje || JSON.stringify(item);
                  const prioridad = (item.prioridad || '').toLowerCase();
                  let badgeColor = 'var(--secondary)';
                  if (prioridad === 'alta') badgeColor = 'var(--danger)';
                  else if (prioridad === 'media') badgeColor = 'var(--warning)';
                  return (
                    <li key={i} style={{ lineHeight:1.35, color:'var(--text-secondary)', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <Icon name="lightbulb" size={12} style={{ color:badgeColor }} />
                        <span style={{ flex:1 }}>{texto}</span>
                        {prioridad && (
                          <span style={{ fontSize:'0.55rem', padding:'0.15rem 0.4rem', borderRadius:'999px', background: prioridad==='alta' ? 'rgba(225,29,72,0.15)' : prioridad==='media' ? 'rgba(251,146,60,0.2)' : 'rgba(107,114,128,0.2)', color: badgeColor, fontWeight:600 }}>
                            {prioridad.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {item.id && <div style={{ fontSize:'0.55rem', color:'var(--text-tertiary)' }}>ID: {item.id}</div>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {data.analisis_ia && (
            <div className="card" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.9rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem' }}>
                <h3 style={{ margin:0 }}>Análisis IA</h3>
                {data.analisis_ia.tendencia && (
                  <span style={{ fontSize:'0.6rem', padding:'0.3rem 0.55rem', borderRadius:'999px', fontWeight:600,
                    background: (data.analisis_ia.tendencia.toLowerCase().includes('negativa') ? 'rgba(225,29,72,0.15)' : data.analisis_ia.tendencia.toLowerCase().includes('positiva') ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)'),
                    color: (data.analisis_ia.tendencia.toLowerCase().includes('negativa') ? 'var(--danger)' : data.analisis_ia.tendencia.toLowerCase().includes('positiva') ? 'var(--secondary)' : 'var(--text-secondary)')
                  }}>{data.analisis_ia.tendencia}</span>
                )}
              </div>
              {data.analisis_ia.evaluacion_general && (
                <div style={{ fontSize:'0.72rem', lineHeight:1.4, background:'var(--surface-2)', padding:'0.7rem 0.75rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                  <strong style={{ display:'block', marginBottom:'0.35rem', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Evaluación General</strong>
                  {data.analisis_ia.evaluacion_general}
                </div>
              )}
              {Array.isArray(data.analisis_ia.puntos_criticos) && data.analisis_ia.puntos_criticos.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  <strong style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Puntos Críticos</strong>
                  <ul style={{ margin:0, paddingLeft:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem', fontSize:'0.7rem' }}>
                    {data.analisis_ia.puntos_criticos.map((p,i)=>(
                      <li key={i} style={{ lineHeight:1.35, display:'flex', gap:'0.45rem' }}>
                        <Icon name="alert" size={12} style={{ color:'var(--danger)', marginTop:2 }} />
                        <span style={{ flex:1 }}>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(data.analisis_ia.recomendaciones) && data.analisis_ia.recomendaciones.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  <strong style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Recomendaciones IA</strong>
                  <ol style={{ margin:0, paddingLeft:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem', fontSize:'0.7rem' }}>
                    {data.analisis_ia.recomendaciones.map((r,i)=>(
                      <li key={i} style={{ lineHeight:1.35, display:'flex', gap:'0.45rem' }}>
                        <Icon name="check" size={12} style={{ color:'var(--secondary)', marginTop:2 }} />
                        <span style={{ flex:1 }}>{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
          {showRaw && (
            <div className="card" style={{ padding:'1rem' }}>
              <h3 style={{ margin:'0 0 0.75rem 0' }}>Raw JSON</h3>
              <pre style={{ maxHeight:400, overflow:'auto', fontSize:'0.65rem', background:'var(--surface-2)', padding:'0.75rem', borderRadius:'var(--radius-sm)' }}>{JSON.stringify(data.raw, null, 2)}</pre>
            </div>
          )}
          </div>
        )}
        
        {/* Presupuestos */}
        {budgetsData && (
          <div className="card" style={{ padding:'1.5rem', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Icon name="list" size={20} style={{ color:'var(--primary)' }} />
                Análisis de Presupuestos
              </h3>
              <button
                onClick={()=>setShowBudgetsRaw(s=>!s)}
                style={{
                  padding:'0.4rem 0.7rem',
                  fontSize:'0.7rem',
                  border:'1px solid var(--border)',
                  borderRadius:'6px',
                  background:'var(--surface)',
                  color:'var(--text-secondary)',
                  cursor:'pointer',
                  transition:'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                {showBudgetsRaw ? 'Ocultar' : 'Ver'} JSON
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {budgetsData.presupuestos && budgetsData.presupuestos.length > 0 && (
            <div style={{ marginBottom:'1rem' }}>
              <h4 style={{ margin:'0 0 0.75rem 0', fontSize:'0.85rem' }}>Presupuestos Verificados</h4>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.9rem' }}>
                {budgetsData.presupuestos.map((p,i)=>{
                  const pct = p.porcentaje || 0;
                  const estado = (p.estado || '').toLowerCase();
                  let badgeColor = 'var(--secondary)';
                  let badgeBg = 'rgba(16,185,129,0.15)';
                  if (estado === 'excedido') { badgeColor='var(--danger)'; badgeBg='rgba(225,29,72,0.15)'; }
                  else if (estado === 'dentro') { badgeColor='var(--secondary)'; badgeBg='rgba(16,185,129,0.15)'; }
                  return (
                    <div key={i} className="card" style={{ padding:'0.75rem', display:'flex', flexDirection:'column', gap:'0.45rem', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                        <strong style={{ fontSize:'0.7rem', textTransform:'capitalize' }}>{p.categoria}</strong>
                        <span style={{ fontSize:'0.55rem', padding:'0.25rem 0.45rem', borderRadius:'999px', background:badgeBg, color:badgeColor, fontWeight:600 }}>{p.estado}</span>
                      </div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Límite: <strong>{formatCurrency(p.limite)}</strong></div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Gastado: <strong style={{ color: pct>=100 ? 'var(--danger)' : pct>=75 ? 'var(--warning)' : 'var(--text-secondary)' }}>{formatCurrency(p.gastado)}</strong></div>
                      <div style={{ height:6, background:'var(--surface-2)', borderRadius:4, overflow:'hidden', marginTop:4 }}>
                        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: pct>=100 ? 'var(--danger)' : pct>=75 ? 'var(--warning)' : 'var(--secondary)', transition:'width .4s' }} />
                      </div>
                      <div style={{ fontSize:'0.55rem', color:'var(--text-tertiary)', display:'flex', justifyContent:'space-between' }}>
                        <span>{pct.toFixed(2)}%</span>
                        <span>{p.estado}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:'0.6rem', marginTop:'0.75rem', color:'var(--text-tertiary)' }}>status: <strong>{budgetsData.status || '—'}</strong> • protocol: <strong>{budgetsData.protocol || '—'}</strong> • message_id: <strong>{budgetsData.message_id || '—'}</strong> • timestamp: <strong>{budgetsData.timestamp || '—'}</strong></div>
            </div>
          )}
          {budgetsData.analisis_ia && (
            <div style={{ marginBottom:'1rem' }}>
              <h4 style={{ margin:'0 0 0.75rem 0', fontSize:'0.85rem' }}>Narrativa Presupuestos IA</h4>
              <div style={{ fontSize:'0.68rem', lineHeight:1.4, background:'var(--surface-2)', padding:'0.8rem', borderRadius:'6px', border:'1px solid var(--border)' }}>
                {typeof budgetsData.analisis_ia === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: budgetsData.analisis_ia.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>') }} />
                ) : (
                  <pre style={{ fontSize:'0.6rem', whiteSpace:'pre-wrap' }}>{JSON.stringify(budgetsData.analisis_ia, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
          {budgetsData.recomendaciones && budgetsData.recomendaciones.length > 0 && (
            <div style={{ marginBottom:'1rem' }}>
              <h4 style={{ margin:'0 0 0.75rem 0', fontSize:'0.85rem' }}>Recomendaciones Presupuestos</h4>
              <ol style={{ margin:0, paddingLeft:'1rem', display:'flex', flexDirection:'column', gap:'0.55rem', fontSize:'0.7rem' }}>
                {budgetsData.recomendaciones.map((r,i)=>(
                  <li key={i} style={{ lineHeight:1.35, display:'flex', gap:'0.45rem' }}>
                    <Icon name="check" size={12} style={{ color:'var(--secondary)', marginTop:2 }} />
                    <span style={{ flex:1 }} dangerouslySetInnerHTML={{ __html: r.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
                  </li>
                ))}
              </ol>
            </div>
          )}
          {showBudgetsRaw && budgetsData && (
            <div style={{ marginTop:'1rem' }}>
              <h4 style={{ margin:'0 0 0.75rem 0', fontSize:'0.85rem' }}>Raw JSON Presupuestos</h4>
              <pre style={{ maxHeight:400, overflow:'auto', fontSize:'0.65rem', background:'var(--surface-2)', padding:'0.75rem', borderRadius:'6px' }}>{JSON.stringify(budgetsData.raw, null, 2)}</pre>
            </div>
          )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal Proceso Completo */}
      {showProcessModal && (
        <div
          style={{
            position:'fixed',
            top:0,
            left:0,
            right:0,
            bottom:0,
            background:'rgba(0,0,0,0.75)',
            backdropFilter:'blur(4px)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            zIndex:9999,
            padding:'1.5rem'
          }}
          onClick={() => setShowProcessModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth:1000,
              maxHeight:'90vh',
              overflow:'auto',
              padding:'2rem',
              background:'#ffffff',
              borderRadius:'16px',
              boxShadow:'0 25px 80px rgba(0,0,0,0.5)',
              border:'1px solid #e5e7eb'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', paddingBottom:'1rem', borderBottom:'2px solid var(--border)' }}>
              <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'1.5rem', fontWeight:700 }}>
                <Icon name="layers" size={28} style={{ color:'var(--primary)' }} />
                Proceso Completo
              </h3>
              <button
                onClick={() => setShowProcessModal(false)}
                style={{
                  background:'var(--surface)',
                  border:'2px solid var(--border)',
                  borderRadius:'8px',
                  cursor:'pointer',
                  padding:'0.5rem',
                  color:'var(--text-secondary)',
                  display:'flex',
                  alignItems:'center',
                  transition:'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Icon name="x" size={24} />
              </button>
            </div>
            {processLoading && <p style={{ fontSize:'0.85rem', textAlign:'center', padding:'2rem' }}>Cargando proceso...</p>}
            {processError && <p className="error">{processError}</p>}
            {processData && (
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-tertiary)' }}>status: <strong>{processData.status || '—'}</strong> • protocol: <strong>{processData.protocol || '—'}</strong></div>
                {processData.estrategia && (
                  <div style={{ fontSize:'0.7rem', lineHeight:1.4, background:'var(--surface-2)', padding:'0.75rem', borderRadius:'8px', border:'1px solid var(--border)' }}>
                    <strong style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--primary)' }}>Estrategia</strong>
                    {processData.estrategia}
                  </div>
                )}
                {processData.subtareas && processData.subtareas.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    <strong style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--primary)' }}>Subtareas Planificadas</strong>
                    <ul style={{ margin:0, paddingLeft:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {processData.subtareas.map(st => (
                        <li key={st.id} style={{ fontSize:'0.7rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                            <span style={{ fontWeight:600, color:'var(--primary)' }}>#{st.id}</span>
                            <span style={{ flex:1, minWidth:120 }}>{st.tipo}</span>
                            {st.prioridad && (
                              <span style={{ fontSize:'0.55rem', padding:'0.2rem 0.5rem', borderRadius:'999px', background: st.prioridad==='alta' ? 'rgba(225,29,72,0.15)' : st.prioridad==='media' ? 'rgba(251,146,60,0.15)' : 'rgba(107,114,128,0.15)', color: st.prioridad==='alta' ? 'var(--danger)' : st.prioridad==='media' ? 'var(--warning)' : 'var(--text-secondary)', fontWeight:600 }}>{st.prioridad}</span>
                            )}
                            {st.agente && (
                              <span style={{ fontSize:'0.55rem', padding:'0.2rem 0.5rem', borderRadius:'999px', background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>{st.agente}</span>
                            )}
                          </div>
                          {st.descripcion && <div style={{ fontSize:'0.6rem', color:'var(--text-tertiary)', paddingLeft:'1.5rem' }}>{st.descripcion}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {processData.tareas_ejecutadas && processData.tareas_ejecutadas.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginTop:'0.5rem' }}>
                    <strong style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--primary)' }}>Resultados de Ejecución</strong>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.7rem' }}>
                      {processData.tareas_ejecutadas.map(t => {
                        const status = (t.status || '').toLowerCase();
                        let badgeColor = 'var(--text-secondary)';
                        if (status.includes('completed') || status.includes('calculated') || status.includes('verified')) badgeColor = 'var(--secondary)';
                        if (status.includes('alert')) badgeColor = 'var(--warning)';
                        return (
                          <div key={t.id} className="card" style={{ padding:'0.7rem', display:'flex', flexDirection:'column', gap:'0.45rem', border:'1px solid var(--border)', borderRadius:'8px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ fontSize:'0.65rem', fontWeight:600 }}>#{t.id} {t.tipo}</span>
                              <span style={{ fontSize:'0.55rem', padding:'0.2rem 0.5rem', borderRadius:'999px', background:'var(--surface-2)', color: badgeColor, fontWeight:600 }}>{t.status || '—'}</span>
                            </div>
                            {t.agente && <div style={{ fontSize:'0.55rem', color:'var(--text-tertiary)' }}>Agente: {t.agente}</div>}
                            {t.protocol_used && <div style={{ fontSize:'0.55rem', color:'var(--text-tertiary)' }}>Protocol: {t.protocol_used}</div>}
                            {t.mensaje_alerta && <div style={{ fontSize:'0.55rem', color:'var(--warning)' }}>{t.mensaje_alerta}</div>}
                            {t.resumen_ui && <div style={{ fontSize:'0.55rem', color:'var(--text-secondary)' }}>Balance: {t.resumen_ui.balance} • Ingresos: {t.resumen_ui.ingresos} • Gastos: {t.resumen_ui.gastos}</div>}
                            {t.health && <div style={{ fontSize:'0.55rem', color:'var(--secondary)' }}>Health: {t.health.system_health}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
                  <button className="btn-secondary" onClick={()=>setShowProcessRaw(s=>!s)} style={{ fontSize:'0.7rem', padding:'0.5rem 0.75rem' }}>
                    {showProcessRaw ? 'Ocultar JSON' : 'Ver JSON Raw'}
                  </button>
                </div>
                {showProcessRaw && (
                  <pre style={{ maxHeight:300, overflow:'auto', fontSize:'0.6rem', background:'var(--surface-2)', padding:'0.75rem', borderRadius:'8px', marginTop:'0.5rem' }}>{JSON.stringify(processData.raw, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
