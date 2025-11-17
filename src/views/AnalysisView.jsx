import React, { useState } from 'react';
import api from '../api/client';
import { Icon } from '../components/Icon';
import DonutChart from '../components/DonutChart';

export default function AnalysisView({ userId }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [showJson, setShowJson] = useState(false);

  const guardUser = () => {
    if (!userId) { alert('Selecciona un usuario primero'); return false; }
    return true;
  };

  const runCompleteAnalysis = async () => {
    if (!guardUser()) return;
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    
    try {
      // Llamar a todos los endpoints en paralelo (incluye dashboard AGUI)
      const [dashboard, balance, budgets, complete, recs] = await Promise.all([
        api.getDashboard(userId),
        api.analysisBalance(userId, days),
        api.analysisBudgets(userId, days),
        api.analysisComplete(userId, days),
        api.recommendations(userId, 'optimizar_gastos')
      ]);

      setAnalysisData({ dashboard, balance, budgets, complete, recs });
    } catch (e) {
      const msg = e?.message || 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Utilidad para parsear valores numéricos que pueden venir como string con símbolos, comas, espacios.
  const parseNumeric = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'string') {
      // Detectar formato: quitar símbolos de moneda y espacios.
      // Estrategia: si hay más de un separador (coma/punto), asumimos que las comas son miles y dejamos el último punto como decimal.
      let cleaned = v.trim();
      // Reemplazar cualquier caracter no permitido (excepto dígitos, coma, punto, signo menos)
      cleaned = cleaned.replace(/[^0-9.,-]/g, '');
      // Si contiene ambos "," y "." decidir:
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      if (hasComma && hasDot) {
        // Normalizar: quitar todas las comas (asumidas miles)
        cleaned = cleaned.replace(/,/g, '');
      } else if (hasComma && !hasDot) {
        // Posible formato europeo: usar coma como decimal => reemplazar por punto.
        cleaned = cleaned.replace(/,/g, '.');
      }
      // Quitar múltiples puntos salvo último (ej: "12.345.67") -> considerar primer parte miles
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        const decimal = parts.pop();
        cleaned = parts.join('') + '.' + decimal;
      }
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // ACP balance (análisis/balance)
  const extractBalanceACP = (payload) => {
    const resultado = payload?.analisis?.resultado || payload?.resultado || null;
    if (!resultado) return null;
    const ingresos = Number(resultado.ingresos_totales ?? 0);
    const gastos = Number(resultado.gastos_totales ?? 0);
    const balance = Number(resultado.balance ?? (ingresos - gastos));
    const totalTx = Number(resultado.total_transacciones ?? 0);
    const categorias = resultado.gastos_por_categoria || {};
    const totalGastosCat = Object.values(categorias).reduce((a, b) => a + Number(b || 0), 0);
    const totalGastosBase = gastos || totalGastosCat || 1;
    const analisisIA = resultado.analisis_ia || {};
    const tendencia = (analisisIA.tendencia || '').toLowerCase();
    return { origen: 'acp', ingresos, gastos, balance, totalTx, categorias, totalGastosBase, analisisIA, tendencia };
  };

  // Extract complete plan data from ANP task_results if present
  const extractPlanData = (completePayload) => {
    const plan = completePayload?.plan || null;
    if (!plan || !plan.task_results) return null;
    const subtareas = plan.plan?.subtareas || [];
    const taskResults = plan.task_results || [];
    return { subtareas, taskResults, estrategia: plan.plan?.estrategia || '' };
  };

  // AGUI dashboard: búsqueda flexible del resumen financiero y parseo robusto de números
  const extractFinancialSummaryAGUI = (dashboardPayload) => {
    if (!dashboardPayload || typeof dashboardPayload !== 'object') return null;
    // Intentar extraer el objeto ui_data primero
    const uiCandidates = [
      dashboardPayload?.dashboard?.ui_data,
      dashboardPayload?.response?.ui_data,
      dashboardPayload?.data?.ui_data,
      dashboardPayload?.ui_data
    ].filter(Boolean);
    let ui = uiCandidates[0] || null;
    // Búsqueda profunda de ui_data si no existe
    if (!ui) {
      const searchUI = (obj, depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 6) return null;
        if (obj.ui_data) return obj.ui_data;
        for (const k of Object.keys(obj)) {
          const found = searchUI(obj[k], depth + 1);
          if (found) return found;
        }
        return null;
      };
      ui = searchUI(dashboardPayload);
    }

    // Dentro de ui, buscar resumen_financiero, y si no, un "resumen" simple
    const dsh = ui?.dashboard || {};
    const resumenFin = dsh.resumen_financiero || ui?.resumen_financiero || null;
    const resumenSimple = ui?.resumen || null;
    const resumen = resumenFin || resumenSimple;
    if (!resumen) return null;

    // Mapear a formato común
    let ingresosValor = 0, gastosValor = 0, balanceValor = 0, totalTxValor = 0;
    let ingresosDesc = '', gastosDesc = '', balanceDesc = '', balanceEstado = '', balanceAlerta = '', totalTxDesc = '';
    let titulo = 'Resumen Financiero';
    // Etiqueta de gastos cuando el valor del mes es texto (p.ej. "Pendiente ...")
    let gastosLabel = '';

    if (resumenFin) {
      titulo = resumenFin.titulo || titulo;
      // Tomar valores tal como vienen en el dashboard (manejar múltiples variantes)
      const rawIngresos =
        resumenFin.ingresos_totales?.valor ??
        resumenFin.ingresos?.valor ??
        resumenFin.ingresos ??
        resumenFin.ingreso_mensual ??
        ui?.resumen?.ingresos ?? 0;
      // Preferir SIEMPRE el gasto del mes desde el dashboard si existe
      const rawGastosMes = resumenFin.gastos_totales_mes_actual;
      const rawGastos =
        (rawGastosMes !== undefined ? rawGastosMes : (
          resumenFin.gastos_totales?.valor ??
          resumenFin.gastos?.valor ??
          resumenFin.gastos ??
          ui?.resumen?.gastos ?? 0
        ));
      const rawBalance =
        resumenFin.balance?.valor ??
        resumenFin.flujo_de_caja?.valor ??
        resumenFin.flujo_de_caja ??
        resumenFin.balance ??
        (parseNumeric(rawIngresos) - parseNumeric(rawGastos));
      const rawTx =
        resumenFin.total_transacciones?.valor ??
        resumenFin.total_transacciones ??
        dsh?.tendencias_recientes?.transacciones_recientes ??
        ui?.resumen?.total_transacciones ?? 0;

      ingresosValor = parseNumeric(rawIngresos);
      gastosValor = parseNumeric(rawGastos);
      balanceValor = parseNumeric(rawBalance);
      totalTxValor = parseNumeric(rawTx);

      ingresosDesc = resumenFin.ingresos_totales?.descripcion || resumenFin.ingresos?.descripcion || '';
      gastosDesc = resumenFin.gastos_totales?.descripcion || resumenFin.gastos?.descripcion || '';
      // Si el gasto del mes existe pero es un texto no numérico (p.ej. "Pendiente ..."), conservarlo para UI
      const gastosMesNum = parseNumeric(rawGastosMes);
      const gastosMesStr = typeof rawGastosMes === 'string' ? rawGastosMes : '';
      gastosLabel = (rawGastosMes !== undefined && gastosMesStr && gastosMesNum === 0) ? gastosMesStr : '';
      balanceDesc = resumenFin.balance?.descripcion || resumenFin.flujo_de_caja?.descripcion || '';
      balanceEstado = resumenFin.balance?.estado || '';
      balanceAlerta = resumenFin.balance?.alerta || '';
      totalTxDesc = resumenFin.total_transacciones?.descripcion || '';

      // Si el dashboard trae detalles de presupuestos, calcular gastos del mes en el front
      const ep = dsh?.estado_presupuestos || {};
      const epArr = Array.isArray(ep.detalles) ? ep.detalles : (Array.isArray(ep.presupuestos) ? ep.presupuestos : []);
      if (epArr.length > 0) {
        const gastosCalc = epArr.reduce((acc, it) => acc + parseNumeric(it.gastado || it.monto_gastado || it.gastos || 0), 0);
        const rawGastosMesNum = parseNumeric(rawGastosMes);
        const rawGastosMesIsNonNumeric = typeof rawGastosMes === 'string' && !/[0-9]/.test(rawGastosMes);
        if ((rawGastosMes === undefined || rawGastosMesIsNonNumeric || rawGastosMesNum === 0) && gastosCalc > 0) {
          gastosValor = gastosCalc;
          if (!gastosDesc) gastosDesc = 'Calculado desde presupuestos activos (dashboard)';
        }
        // Si el balance no viene numérico, recalcular con ingresos - gastos
        const rawBalanceHasDigits = typeof rawBalance === 'number' || (typeof rawBalance === 'string' && /[0-9]/.test(rawBalance));
        if (!rawBalanceHasDigits) {
          balanceValor = parseNumeric(ingresosValor) - parseNumeric(gastosValor);
        }
      }
    } else if (resumenSimple) {
      ingresosValor = parseNumeric(resumenSimple.ingresos);
      gastosValor = parseNumeric(resumenSimple.gastos);
      balanceValor = parseNumeric(resumenSimple.balance !== undefined ? resumenSimple.balance : (ingresosValor - gastosValor));
      // No hay descripciones en este formato
    }

    const tendencia = (balanceEstado || '').toLowerCase().includes('negativo') || balanceValor < 0 ? 'negativa' : 'positiva';
    const alertasAGUI = Array.isArray(ui?.alertas) ? ui.alertas : [];
    const tendenciasAGUI = typeof ui?.tendencias === 'string' ? ui.tendencias : '';
    const presupuestosAGUI = Array.isArray(ui?.presupuestos) ? ui.presupuestos : [];
    const recomendacionesAGUI = Array.isArray(ui?.recomendaciones) ? ui.recomendaciones : [];
    // Si hay ui_data.dashboard con más secciones
    const dashSections = dsh || {};
    const estadoPresupuestos = dashSections.estado_presupuestos || null;
    const recomendacionesPrincipales = dashSections.recomendaciones_principales || null;
    const tendenciasRecientes = dashSections.tendencias_recientes || null;

    return {
      origen: 'agui',
      titulo,
      ingresos: ingresosValor,
      ingresosDesc,
      gastos: gastosValor,
      gastosDesc,
      balance: balanceValor,
      balanceDesc,
      balanceEstado,
      balanceAlerta,
      totalTx: totalTxValor,
      totalTxDesc,
      categorias: {},
      analisisIA: {},
      tendencia,
      alertasAGUI,
      tendenciasAGUI,
      presupuestosAGUI,
      recomendacionesAGUI,
      gastosLabel,
      estadoPresupuestos,
      recomendacionesPrincipales,
      tendenciasRecientes
    };
  };

  const formatCurrency = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
  
  const extractBudgets = (payload) => {
    const resultado = payload?.analisis?.resultado || payload?.resultado || null;
    if (!resultado) return null;
    const lista = Array.isArray(resultado.presupuestos) ? resultado.presupuestos : [];
    const textoIA = resultado.analisis_ia || '';
    const recomendaciones = Array.isArray(resultado.recomendaciones) ? resultado.recomendaciones : [];
    return { lista, textoIA, recomendaciones };
  };

  const extractRecommendations = (payload) => {
    const insights = payload?.insights?.insights?.insights || [];
    const sugerencias = payload?.insights?.insights?.sugerencias || [];
    const alertas = payload?.insights?.insights?.alertas || [];
    const comparaciones = payload?.insights?.insights?.comparaciones || {};
    const predicciones = payload?.prediccion?.prediccion?.predicciones || [];
    const tendencia = payload?.prediccion?.prediccion?.tendencia_general || '';
    const factores = payload?.prediccion?.prediccion?.factores_considerados || [];
    return { insights, sugerencias, alertas, comparaciones, predicciones, tendencia, factores };
  };

  return (
    <div className="view">
      <h2>Análisis Completo (IA)</h2>
      <div className="simple-form">
        <label>Días
          <input type="number" min={1} max={365} value={days} onChange={e => setDays(parseInt(e.target.value || '30', 10))} />
        </label>
        <button className="btn-primary" onClick={runCompleteAnalysis} disabled={loading}>
          {loading ? 'Analizando...' : 'Realizar Análisis Completo'}
        </button>
      </div>
      {loading && <p>Cargando análisis completo...</p>}
      {error && <p className="error">{error}</p>}

      {!analysisData && !loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="brain" size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No hay análisis disponible</h3>
          <p style={{ color: 'var(--text-tertiary)' }}>Haz clic en "Realizar Análisis Completo" para obtener información detallada sobre tus finanzas</p>
        </div>
      )}
      {analysisData && (() => {
        const aguiSummary = extractFinancialSummaryAGUI(analysisData.dashboard);
        const b = aguiSummary || extractBalanceACP(analysisData.balance);
        const budgets = extractBudgets(analysisData.budgets);
        const rec = extractRecommendations(analysisData.recs);
        const planData = extractPlanData(analysisData.complete);
        const ia = b?.analisisIA || {};
        const categoriasEntries = b && b.origen === 'acp' ? Object.entries(b.categorias || {}) : [];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Resumen / Balance */}
            {b && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{b.origen === 'agui' ? (b.titulo || 'Resumen Financiero') : 'Balance Financiero'}</h3>
                  <span className={`budget-status ${(b.tendencia === 'positiva' || b.balance >= 0) ? 'ok' : 'danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={b.balance >= 0 ? 'trendingUp' : 'trendingDown'} size={18} />
                    {(b.balance >= 0 ? 'Positivo' : 'Negativo')}
                  </span>
                </div>
                {b.balanceAlerta && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(225,29,72,0.08)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}>
                    <Icon name="alertTriangle" size={14} /> {b.balanceAlerta}
                  </div>
                )}
                {Array.isArray(b.alertasAGUI) && b.alertasAGUI.length > 0 && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(251,146,60,0.08)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <Icon name="alertTriangle" size={14} style={{ color:'var(--warning)' }} />
                      <strong style={{ fontSize:'0.85rem' }}>Alertas</strong>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {b.alertasAGUI.map((al,i)=>(
                        <div key={i} style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{typeof al==='string'? al : JSON.stringify(al)}</div>
                      ))}
                    </div>
                  </div>
                )}
                {b.tendenciasAGUI && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color:'var(--text-secondary)' }}>
                    {b.tendenciasAGUI}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: categoriasEntries.length ? '1.5rem' : '0.5rem' }}>
                  <div className="card stat-card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Icon name="arrowUp" size={16} style={{ color: 'var(--secondary)' }} />
                      <div className="stat-label">Ingresos</div>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--secondary)' }}>{formatCurrency(b.ingresos)}</div>
                    {b.ingresosDesc && <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>{b.ingresosDesc}</div>}
                  </div>
                  <div className="card stat-card" style={{ background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1) 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Icon name="arrowDown" size={16} style={{ color: 'var(--danger)' }} />
                      <div className="stat-label">Gastos</div>
                    </div>
                    {b.gastosLabel && b.gastos === 0 ? (
                      <div className="stat-value" style={{ color: 'var(--danger)', fontSize:'0.9rem' }}>{b.gastosLabel}</div>
                    ) : (
                      <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(b.gastos)}</div>
                    )}
                    {b.gastosDesc && <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>{b.gastosDesc}</div>}
                  </div>
                  <div className="card stat-card" style={{ background: b.balance >= 0 ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%)' : 'linear-gradient(135deg, rgba(225, 29, 72, 0.05) 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Icon name={b.balance >= 0 ? 'check' : 'alertTriangle'} size={16} style={{ color: b.balance >= 0 ? 'var(--secondary)' : 'var(--danger)' }} />
                      <div className="stat-label">Balance</div>
                    </div>
                    <div className="stat-value" style={{ color: b.balance >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>{formatCurrency(b.balance)}</div>
                    {b.balanceDesc && <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>{b.balanceDesc}</div>}
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Transacciones</div>
                    <div className="stat-value">{b.totalTx}</div>
                    {b.totalTxDesc && <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>{b.totalTxDesc}</div>}
                  </div>
                </div>
                {categoriasEntries.length > 0 && (() => {
                  const sorted = [...categoriasEntries].sort((a,b2)=>Number(b2[1])-Number(a[1]));
                  const palette = ['#e11d48','#f59e0b','#6366f1','#06b6d4','#22c55e','#84cc16','#f97316','#a855f7'];
                  const slices = sorted.map(([cat,val],i)=>({ value:Number(val||0), color:palette[i%palette.length], label:cat }));
                  return (
                    <div style={{ marginTop: '0.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0' }}>Distribución de Gastos</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                        <DonutChart
                          slices={slices}
                          size={240}
                          thickness={34}
                          center={
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Gasto Total</div>
                              <div style={{ fontWeight:700, fontSize:'1.15rem' }}>{formatCurrency(b.totalGastosBase)}</div>
                            </div>
                          }
                          ariaLabel="Distribución de gastos por categoría"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                          {sorted.map(([cat,val],i)=>{
                            const pct = b.totalGastosBase ? (Number(val||0)/b.totalGastosBase)*100 : 0;
                            return (
                              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette[i%palette.length], flexShrink: 0 }} />
                                <span style={{ flex: 1, textTransform: 'capitalize' }}>{cat}</span>
                                <strong style={{ fontSize: '0.7rem' }}>{formatCurrency(val)}</strong>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{pct.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {ia.evaluacion_general && (
                  <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--surface-2)', borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Icon name="fileText" size={16} style={{ color: 'var(--primary)' }} />
                        <strong style={{ fontSize: '0.85rem' }}>Evaluación General</strong>
                      </div>
                      <p style={{ margin:0, fontSize: '0.8rem', lineHeight:1.4, color: 'var(--text-secondary)' }}>{ia.evaluacion_general}</p>
                    </div>
                    {Array.isArray(ia.puntos_criticos) && ia.puntos_criticos.length > 0 && (
                      <div style={{ padding: '1rem', background: 'var(--surface-2)', borderLeft: '3px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Icon name="alertTriangle" size={16} style={{ color: 'var(--danger)' }} />
                          <strong style={{ fontSize: '0.85rem' }}>Puntos Críticos</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {ia.puntos_criticos.map((p,i)=>(
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--danger)', marginTop: '0.15rem' }}>•</span>
                              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(ia.recomendaciones) && ia.recomendaciones.length > 0 && (
                      <div style={{ padding: '1rem', background: 'var(--surface-2)', borderLeft: '3px solid var(--secondary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Icon name="lightbulb" size={16} style={{ color: 'var(--secondary)' }} />
                          <strong style={{ fontSize: '0.85rem' }}>Recomendaciones</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {ia.recomendaciones.map((r,i)=>(
                            <div key={i} style={{ display:'flex', gap:'0.5rem', fontSize:'0.75rem' }}>
                              <span style={{ color:'var(--secondary)', marginTop:'0.15rem' }}>✓</span>
                              <span style={{ color:'var(--text-secondary)', lineHeight:1.4 }}>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Presupuestos */}
            {budgets && budgets.lista.length > 0 && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <h3 style={{ margin:0 }}>Estado de Presupuestos</h3>
                  <span className={`budget-status ${budgets.lista.some(p => (p.estado||'').toLowerCase()==='excedido') ? 'danger' : 'ok'}`}>{budgets.lista.some(p => (p.estado||'').toLowerCase()==='excedido') ? 'Requiere Atención' : 'Saludable'}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1rem' }}>
                  {budgets.lista.map((p,i)=>{
                    const percent = Math.round(p.porcentaje ?? ((p.gastado / (p.limite || 1))*100));
                    const estado = (p.estado||'').toLowerCase();
                    let fillClass='';
                    if(percent>=100) fillClass='danger'; else if(percent>=75) fillClass='warning';
                    return (
                      <div key={i} className="budget-item" style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'1rem' }}>
                        <div className="budget-header" style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem' }}>
                          <div className="budget-category" style={{ textTransform:'capitalize' }}>{p.categoria}</div>
                          <div className="budget-status" style={{ color: fillClass==='danger' ? 'var(--danger)' : fillClass==='warning' ? 'var(--warning)' : 'var(--secondary)' }}>
                            {estado==='excedido' ? 'Excedido' : percent>=75 ? 'Cerca del límite' : 'Dentro del límite'}
                          </div>
                        </div>
                        <div className="budget-amounts" style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'0.4rem' }}>
                          <strong style={{ fontSize:'0.8rem' }}>{formatCurrency(p.gastado)}</strong> / {formatCurrency(p.limite)} • {percent}%
                        </div>
                        <div className="progress-bar" style={{ height:6, background:'var(--surface-2)', borderRadius:4, overflow:'hidden' }}>
                          <div className={`progress-fill ${fillClass}`} style={{ height:'100%', width:`${Math.min(100,percent)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {budgets.textoIA && (
                  <div style={{ padding:'1rem', background:'var(--surface-2)', borderLeft:'3px solid var(--primary)', borderRadius:'var(--radius-md)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
                      <Icon name="brain" size={16} style={{ color:'var(--primary)' }} />
                      <strong style={{ fontSize:'0.85rem' }}>Evaluación IA</strong>
                    </div>
                    <p style={{ margin:0, fontSize:'0.75rem', lineHeight:1.4, color:'var(--text-secondary)' }}>{budgets.textoIA}</p>
                  </div>
                )}
              </div>
            )}
            {/* Presupuestos AGUI (desde ui_data si no hay lista ACP) */}
            {b && b.origen === 'agui' && b.presupuestosAGUI && b.presupuestosAGUI.length > 0 && (
              <div className="card">
                <h3 style={{ margin:'0 0 1rem 0' }}>Presupuestos Definidos</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {b.presupuestosAGUI.map((p,i)=>{
                    if(typeof p==='string') return <div key={i} style={{ padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--text-secondary)' }}>{p}</div>;
                    return (
                      <div key={i} style={{ padding:'0.75rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                          <span style={{ fontWeight:600, textTransform:'capitalize', fontSize:'0.85rem' }}>{p.categoria || 'Categoría'}</span>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-tertiary)' }}>{p.periodo || ''}</span>
                        </div>
                        {p.limite && <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Límite: {formatCurrency(p.limite)}</div>}
                        {p.gastado !== undefined && <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Gastado: {formatCurrency(p.gastado)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Estado de Presupuestos (dashboard.estado_presupuestos) */}
            {b && b.origen === 'agui' && b.estadoPresupuestos && (() => {
              const estado = b.estadoPresupuestos;
              const titulo = estado.titulo || 'Estado de Presupuestos';
              // Intentar obtener presupuestos de diferentes campos posibles
              const presups = Array.isArray(estado.detalles) ? estado.detalles : 
                             Array.isArray(estado.presupuestos) ? estado.presupuestos : [];
              const mensaje = estado.mensaje_general || estado.mensaje || '';
              const numActivos = estado.presupuestos_activos || presups.length || 0;
              
              if (presups.length === 0) return null;
              
              return (
                <div className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    <h3 style={{ margin:0 }}>{titulo}</h3>
                    <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                      {numActivos} presupuesto{numActivos !== 1 ? 's' : ''} activo{numActivos !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {mensaje && <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'1rem', lineHeight:1.4 }}>{mensaje}</p>}
                  <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                    {presups.map((pr,i)=>{
                      const gastado = parseNumeric(pr.gastado || pr.monto_gastado || 0);
                      const limite = parseNumeric(pr.limite || pr.monto_limite || pr.monto || 1);
                      const pct = pr.porcentaje_uso || pr.porcentaje_gastado || pr.porcentaje || ((gastado / limite) * 100);
                      const estado = (pr.estado || '').toLowerCase();
                      let colorClass = pct >= 100 || estado.includes('sobrepasado') || estado.includes('excedido') ? 'danger' : pct >= 80 ? 'warning' : 'ok';
                      return (
                        <div key={i} style={{ padding:'0.75rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                            <span style={{ fontWeight:600, textTransform:'capitalize', fontSize:'0.85rem' }}>{pr.categoria || pr.nombre || 'Presupuesto'}</span>
                            <span className={`budget-status ${colorClass}`} style={{ fontSize:'0.7rem' }}>
                              {pr.estado || (pct>=100?'Excedido':pct>=80?'Advertencia':'Normal')}
                            </span>
                          </div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'0.5rem' }}>
                            <strong>{formatCurrency(gastado)}</strong> / {formatCurrency(limite)} • {Math.round(pct)}%
                          </div>
                          <div className="progress-bar" style={{ height:6, background:'var(--surface-2)', borderRadius:4, overflow:'hidden', border:'1px solid var(--border)' }}>
                            <div className={`progress-fill ${colorClass}`} style={{ height:'100%', width:`${Math.min(100,pct)}%` }} />
                          </div>
                          {(pr.descripcion || pr.variacion_descripcion) && (
                            <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginTop:'0.5rem' }}>
                              {pr.descripcion || pr.variacion_descripcion}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* Recomendaciones AGUI */}
            {b && b.origen === 'agui' && b.recomendacionesAGUI && b.recomendacionesAGUI.length > 0 && (
              <div className="card">
                <h3 style={{ margin:'0 0 1rem 0' }}>Recomendaciones Financieras</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {b.recomendacionesAGUI.map((r,i)=>{
                    if(typeof r==='string') return (
                      <div key={i} style={{ display:'flex', gap:'0.5rem', padding:'0.75rem', background:'var(--surface-2)', borderLeft:'3px solid var(--secondary)', borderRadius:'var(--radius-sm)' }}>
                        <Icon name="lightbulb" size={16} style={{ color:'var(--secondary)', marginTop:'0.1rem', flexShrink:0 }} />
                        <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.4 }}>{r}</span>
                      </div>
                    );
                    return (
                      <div key={i} style={{ padding:'0.75rem', background:'var(--surface-2)', borderLeft:'3px solid var(--secondary)', borderRadius:'var(--radius-sm)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <Icon name="lightbulb" size={14} style={{ color:'var(--secondary)' }} />
                          {r.categoria && <span style={{ fontWeight:600, fontSize:'0.8rem', textTransform:'capitalize' }}>{r.categoria}</span>}
                          {r.prioridad && <span style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginLeft:'auto' }}>{r.prioridad}</span>}
                        </div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.4 }}>{r.texto || r.descripcion || r.recomendacion || ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Recomendaciones Principales (dashboard.recomendaciones_principales) */}
            {b && b.origen === 'agui' && b.recomendacionesPrincipales && (() => {
              const rp = b.recomendacionesPrincipales;
              
              // Puede ser un array directo o un objeto con arrays dentro
              let recomendaciones = [];
              if (Array.isArray(rp)) {
                recomendaciones = rp;
              } else if (typeof rp === 'object') {
                recomendaciones = rp.recomendaciones || rp.categorias || rp.items || [];
              }
              
              if (!Array.isArray(recomendaciones) || recomendaciones.length === 0) return null;
              
              const titulo = typeof rp === 'object' && rp.titulo ? rp.titulo : 'Recomendaciones Principales';
              const mensaje = typeof rp === 'object' && rp.mensaje ? rp.mensaje : '';
              
              return (
                <div className="card">
                  <h3 style={{ margin:'0 0 1rem 0' }}>{titulo}</h3>
                  {mensaje && <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'1rem', lineHeight:1.4 }}>{mensaje}</p>}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {recomendaciones.map((item,i)=>{
                      // Si es string directo
                      if (typeof item === 'string') {
                        return (
                          <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.75rem', background:'var(--surface-2)', borderRadius:'var(--radius-md)', borderLeft:'3px solid var(--secondary)' }}>
                            <Icon name="lightbulb" size={16} style={{ color:'var(--secondary)', flexShrink:0, marginTop:'0.15rem' }} />
                            <span style={{ fontSize:'0.8rem', lineHeight:1.4 }}>{item}</span>
                          </div>
                        );
                      }
                      
                      // Si es objeto con recomendacion/texto/descripcion
                      const txt = item.recomendacion || item.texto || item.descripcion || item.mensaje || '';
                      const prioridad = item.prioridad || '';
                      const categoria = item.categoria || item.tipo || '';
                      
                      let bgColor = 'var(--surface-2)';
                      let borderColor = 'var(--secondary)';
                      if (prioridad.toLowerCase() === 'alta') {
                        borderColor = 'var(--danger)';
                      } else if (prioridad.toLowerCase() === 'media') {
                        borderColor = 'var(--warning)';
                      }
                      
                      return (
                        <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.75rem', background:bgColor, borderRadius:'var(--radius-md)', borderLeft:`3px solid ${borderColor}` }}>
                          <Icon name="lightbulb" size={16} style={{ color:borderColor, flexShrink:0, marginTop:'0.15rem' }} />
                          <div style={{ flex:1 }}>
                            {categoria && <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginBottom:'0.25rem', textTransform:'uppercase', fontWeight:600 }}>{categoria}</div>}
                            <div style={{ fontSize:'0.8rem', lineHeight:1.4, marginBottom: prioridad ? '0.35rem' : 0 }}>{txt}</div>
                            {prioridad && (
                              <span style={{ fontSize:'0.7rem', padding:'0.2rem 0.5rem', background: prioridad.toLowerCase()==='alta' ? 'rgba(225,29,72,0.15)' : prioridad.toLowerCase()==='media' ? 'rgba(251,146,60,0.15)' : 'rgba(107,114,128,0.15)', color: prioridad.toLowerCase()==='alta' ? 'var(--danger)' : prioridad.toLowerCase()==='media' ? 'var(--warning)' : 'var(--text-secondary)', borderRadius:'var(--radius-sm)', fontWeight:600 }}>
                                Prioridad: {prioridad}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* Tendencias Recientes (dashboard.tendencias_recientes) */}
            {b && b.origen === 'agui' && b.tendenciasRecientes && (() => {
              const tr = b.tendenciasRecientes;
              const titulo = tr.titulo || 'Tendencias Recientes';
              const tendencias = tr.tendencias || tr.items || [];
              
              // Campos individuales que pueden existir
              const transaccionesRecientes = tr.transacciones_recientes;
              const graficoGastos = tr.grafico_gastos_por_categoria;
              const tendenciaIngresos = tr.tendencia_ingresos_vs_gastos;
              const categoriasGasto = tr.categorias_gasto_principales;
              
              // Si no hay tendencias ni campos individuales, no mostrar
              if (tendencias.length === 0 && !transaccionesRecientes && !graficoGastos && !tendenciaIngresos && !categoriasGasto) {
                return null;
              }
              
              return (
                <div className="card">
                  <h3 style={{ margin:'0 0 1rem 0' }}>{titulo}</h3>
                  
                  {/* Si hay array de tendencias */}
                  {Array.isArray(tendencias) && tendencias.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'0.75rem', marginBottom: (transaccionesRecientes !== undefined) ? '1rem' : 0 }}>
                      {tendencias.map((t,i)=>{
                        const tipo = (t.tipo || t.categoria || '').toLowerCase();
                        const impacto = (t.impacto || '').toLowerCase();
                        const valor = t.valor || t.cambio || '';
                        const desc = t.mensaje || t.descripcion || t.texto || '';
                        const direccion = (t.direccion || '').toLowerCase();
                        let iconName = 'trendingUp';
                        let iconColor = 'var(--secondary)';
                        
                        if (tipo.includes('creciente') || tipo.includes('aumento')) {
                          iconName = 'trendingUp';
                          iconColor = impacto === 'negativo' ? 'var(--danger)' : 'var(--secondary)';
                        } else if (tipo.includes('decreciente') || tipo.includes('reducción')) {
                          iconName = 'trendingDown';
                          iconColor = impacto === 'positivo' ? 'var(--secondary)' : 'var(--danger)';
                        } else if (direccion.includes('estable')) {
                          iconName = 'minus';
                          iconColor = 'var(--text-tertiary)';
                        }
                        
                        return (
                          <div key={i} className="card stat-card" style={{ padding:'0.75rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderLeft:`3px solid ${iconColor}` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                              <Icon name={iconName} size={16} style={{ color:iconColor }} />
                              <span style={{ fontWeight:600, fontSize:'0.8rem', textTransform:'capitalize' }}>{t.categoria || tipo || 'Tendencia'}</span>
                            </div>
                            {t.tipo && <div style={{ fontSize:'0.7rem', marginBottom:'0.3rem', color:'var(--text-tertiary)' }}>{t.tipo}</div>}
                            {valor && <div style={{ fontSize:'1rem', fontWeight:700, color:iconColor, marginBottom:4 }}>{valor}</div>}
                            {desc && <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', lineHeight:1.3 }}>{desc}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Mostrar campos individuales si existen */}
                  {(transaccionesRecientes !== undefined || graficoGastos || tendenciaIngresos || categoriasGasto) && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                      {transaccionesRecientes !== undefined && (
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem' }}>
                          <Icon name="activity" size={14} style={{ color:'var(--primary)' }} />
                          <div><strong>Transacciones recientes:</strong> {transaccionesRecientes}</div>
                        </div>
                      )}
                      {graficoGastos && !graficoGastos.includes('Pendiente') && (
                        <div style={{ padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem' }}>
                          <strong>Gastos por categoría:</strong> {graficoGastos}
                        </div>
                      )}
                      {tendenciaIngresos && !tendenciaIngresos.includes('Pendiente') && (
                        <div style={{ padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem' }}>
                          <strong>Ingresos vs Gastos:</strong> {tendenciaIngresos}
                        </div>
                      )}
                      {categoriasGasto && !categoriasGasto.includes('Pendiente') && (
                        <div style={{ padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem' }}>
                          <strong>Categorías principales:</strong> {categoriasGasto}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Plan de análisis (task_results) */}
            {planData && planData.subtareas.length > 0 && (
              <div className="card">
                <h3 style={{ margin:'0 0 1rem 0' }}>Plan de Análisis Ejecutado</h3>
                {planData.estrategia && (
                  <div style={{ padding:'0.75rem', background:'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)', border:'1px solid var(--primary)', borderRadius:'var(--radius-md)', marginBottom:'1rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <Icon name="target" size={14} style={{ color:'var(--primary)' }} />
                      <strong style={{ fontSize:'0.85rem', color:'var(--primary)' }}>Estrategia</strong>
                    </div>
                    <p style={{ margin:0, fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.4 }}>{planData.estrategia}</p>
                  </div>
                )}
                <div>
                  <h4 style={{ margin:'0 0 0.75rem 0', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:6 }}>
                    <Icon name="list" size={16} />
                    Subtareas Ejecutadas ({planData.subtareas.length})
                  </h4>
                  <div style={{ position:'relative', paddingLeft:'1.5rem' }}>
                    {/* Timeline line */}
                    <div style={{ position:'absolute', left:'0.5rem', top:'0.5rem', bottom:'0.5rem', width:'2px', background:'var(--border)' }} />
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                      {planData.subtareas.map((t,i)=>{
                        const prioridad = (t.prioridad||'').toLowerCase();
                        let prioColor = 'var(--text-tertiary)';
                        if(prioridad==='alta') prioColor='var(--danger)';
                        else if(prioridad==='media') prioColor='var(--warning)';
                        return (
                          <div key={i} style={{ position:'relative', padding:'0.75rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:'0.75rem' }}>
                            {/* Timeline dot */}
                            <div style={{ position:'absolute', left:'-1.6rem', top:'1rem', width:'10px', height:'10px', borderRadius:'50%', background:'var(--primary)', border:'2px solid var(--background)' }} />
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ fontWeight:700, color:'var(--primary)', fontSize:'0.85rem' }}>#{t.id}</span>
                              <span style={{ flex:1, textTransform:'capitalize', color:'var(--text-primary)', fontWeight:600 }}>{t.tipo?.replace(/_/g,' ')}</span>
                              <span style={{ fontSize:'0.7rem', color:prioColor, textTransform:'uppercase', fontWeight:600 }}>{t.prioridad}</span>
                            </div>
                            <div style={{ color:'var(--text-secondary)', lineHeight:1.4 }}>{t.descripcion}</div>
                            {t.agente && <div style={{ marginTop:6, fontSize:'0.7rem', color:'var(--text-tertiary)' }}>Agente: {t.agente}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Recomendaciones e Insights */}
            {rec && (rec.insights.length || rec.sugerencias.length || rec.alertas.length || rec.predicciones.length) > 0 && (
              <div className="card">
                <h3 style={{ margin:'0 0 1rem 0' }}>Recomendaciones e Insights</h3>
                {rec.comparaciones && (rec.comparaciones.gastos_vs_ingresos || rec.comparaciones.categoria_mayor_gasto) && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <h4 style={{ margin:'0 0 0.6rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <Icon name="fileText" size={16} style={{ color:'var(--primary)' }} />Comparaciones
                    </h4>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.75rem' }}>
                      {rec.comparaciones.gastos_vs_ingresos && (
                        <div className="card stat-card" style={{ padding:'0.75rem' }}>
                          <div className="stat-label" style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginBottom:4 }}>Gastos vs Ingresos</div>
                          <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{rec.comparaciones.gastos_vs_ingresos}</div>
                        </div>
                      )}
                      {rec.comparaciones.categoria_mayor_gasto && (
                        <div className="card stat-card" style={{ padding:'0.75rem' }}>
                          <div className="stat-label" style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginBottom:4 }}>Categoría mayor gasto</div>
                          <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', textTransform:'capitalize' }}>{rec.comparaciones.categoria_mayor_gasto}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {rec.insights.length > 0 && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <h4 style={{ margin:'0 0 0.6rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}><Icon name="lightbulb" size={16} style={{ color:'var(--primary)' }} />Insights</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {rec.insights.map((x,i)=>(
                        <div key={i} style={{ padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--text-secondary)' }}>{x}</div>
                      ))}
                    </div>
                  </div>
                )}
                {rec.sugerencias.length > 0 && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <h4 style={{ margin:'0 0 0.6rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}><Icon name="check" size={16} style={{ color:'var(--secondary)' }} />Sugerencias</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                      {rec.sugerencias.map((s,i)=>(
                        <div key={i} style={{ display:'flex', gap:'0.5rem', fontSize:'0.75rem' }}>
                          <span style={{ color:'var(--secondary)', marginTop:'0.2rem' }}>✓</span>
                          <span style={{ color:'var(--text-secondary)', lineHeight:1.4 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rec.alertas.length > 0 && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <h4 style={{ margin:'0 0 0.6rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}><Icon name="alertTriangle" size={16} style={{ color:'var(--warning)' }} />Alertas</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {rec.alertas.map((al,i)=>(
                        <div key={i} style={{ padding:'0.6rem', background:'rgba(251,146,60,0.1)', borderLeft:'3px solid var(--warning)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--text-secondary)' }}>{al}</div>
                      ))}
                    </div>
                  </div>
                )}
                {rec.predicciones.length > 0 && (
                  <div>
                    <h4 style={{ margin:'0 0 0.6rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}><Icon name="trendingUp" size={16} style={{ color:'var(--primary)' }} />Predicciones Futuras</h4>
                    {rec.tendencia && (
                      <p style={{ margin:'0 0 0.9rem 0', padding:'0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--text-secondary)' }}>{rec.tendencia}</p>
                    )}
                    {Array.isArray(rec.factores) && rec.factores.length > 0 && (
                      <div style={{ margin:'0 0 0.9rem 0', display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                        {rec.factores.map((f,i)=>(
                          <span key={i} style={{ fontSize:'0.7rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'999px', padding:'0.2rem 0.5rem', color:'var(--text-secondary)' }}>{f}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.75rem' }}>
                      {rec.predicciones.map((p,i)=>(
                        <div key={i} className="card stat-card" style={{ padding:'0.75rem' }}>
                          <div className="stat-label" style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginBottom:'0.25rem' }}>Mes {p.mes}</div>
                          <div className="stat-value" style={{ fontSize:'1.1rem' }}>{formatCurrency(p.gasto_estimado)}</div>
                          <div style={{ fontSize:'0.6rem', color:'var(--text-tertiary)', marginTop:'0.25rem' }}>Confianza: {p.confianza}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })()}
    </div>
  );
}
