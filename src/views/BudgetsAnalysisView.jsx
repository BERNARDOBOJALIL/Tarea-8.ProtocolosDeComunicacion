import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Icon } from '../components/Icon';

// Vista mínima para análisis remoto de presupuestos
// Endpoint: POST https://api-multiagente.onrender.com/analisis/presupuestos
// Extrae únicamente: presupuestos[], analisis_ia (string u objeto), recomendaciones[]
// Más metadatos: status, protocol, timestamp, message_id

const ENDPOINT = 'https://api-multiagente.onrender.com/analisis/presupuestos';

export default function BudgetsAnalysisView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [dias, setDias] = useState(30);

  const doFetch = async () => {
    if (!usuarioId) { setError('No autenticado: inicia sesión'); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const token = api.getToken();
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ usuario_id: Number(usuarioId), periodo_dias: Number(dias) })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt.slice(0,180)}`);
      }
      const json = await res.json();
      setData(extract(json));
    } catch (e) {
      setError(e.message || 'Error desconocido');
    } finally { setLoading(false); }
  };

  const extract = (root) => {
    if (!root || typeof root !== 'object') return null;
    const taskResults = root?.plan?.task_results || root?.task_results || [];
    let budgetsNode = null;
    let sourceMeta = null;

    // Buscar nodo budgets_verified
    if (Array.isArray(taskResults)) {
      for (const tr of taskResults) {
        const resp = tr?.response;
        if (resp?.status === 'budgets_verified' && resp?.resultado) {
          budgetsNode = resp.resultado;
          sourceMeta = resp;
          break;
        }
      }
    }
    // Fallback directo si viene root.response
    if (!budgetsNode && root?.response?.status === 'budgets_verified') {
      budgetsNode = root.response.resultado || root.response.result || null;
      sourceMeta = root.response;
    }

    // Extraer campos
    const presupuestos = Array.isArray(budgetsNode?.presupuestos) ? budgetsNode.presupuestos : [];
    let analisisIA = budgetsNode?.analisis_ia || null;
    const recomendaciones = Array.isArray(budgetsNode?.recomendaciones) ? budgetsNode.recomendaciones : [];

    // Si analisis_ia vino como objeto en otro formato
    if (!analisisIA) {
      // deep search de analisis_ia
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

  const formatCurrency = (v) => {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat('es-MX',{ style:'currency', currency:'MXN'}).format(v);
  };

  const formatPercentage = (p) => {
    if (p === null || p === undefined) return '—';
    return `${p.toFixed(2)}%`;
  };

  const estadoBadge = (estado) => {
    if (!estado) return { text:'—', color:'var(--text-secondary)', bg:'var(--surface-2)' };
    const e = estado.toLowerCase();
    if (e === 'excedido') return { text:'Excedido', color:'var(--danger)', bg:'rgba(225,29,72,0.15)' };
    if (e === 'dentro') return { text:'Dentro', color:'var(--secondary)', bg:'rgba(16,185,129,0.15)' };
    return { text:estado, color:'var(--warning)', bg:'rgba(251,146,60,0.15)' };
  };

  // Render simple markdown (**bold**)
  const renderNarrativa = (txt) => {
    if (!txt) return null;
    if (typeof txt === 'string') {
      const html = txt
        .replace(/\n\n+/g,'\n')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n/g,'<br/>');
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    // si es objeto con evaluacion_general
    if (typeof txt === 'object') {
      const eg = txt.evaluacion_general || ''; // ya procesado arriba
      const html = eg
        .replace(/\n\n+/g,'\n')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n/g,'<br/>');
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span>{String(txt)}</span>;
  };

  useEffect(() => {
    const token = api.getToken();
    if (!token) { setUserLoading(false); setUserError('Sin sesión'); return; }
    (async () => {
      try {
        setUserLoading(true);
        const me = await api.authMe();
        if (me?.id) setUsuarioId(me.id); else setUserError('No se pudo obtener usuario');
      } catch (e) { setUserError('Error usuario'); }
      finally { setUserLoading(false); }
    })();
  }, []);

  return (
    <div className="view">
      <h2>Análisis de Presupuestos</h2>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'center', marginBottom:'1rem' }}>
        <div style={{ fontSize:'0.65rem', padding:'0.4rem 0.6rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
          {userLoading ? 'Usuario…' : usuarioId ? `Usuario #${usuarioId}` : userError || 'Sin sesión'}
        </div>
        <label style={{ display:'flex', flexDirection:'column', fontSize:'0.65rem' }}>Periodo (días)
          <input type="number" value={dias} min={1} max={365} onChange={e=>setDias(e.target.value)} style={{ padding:'0.4rem', fontSize:'0.7rem', minWidth:90 }} />
        </label>
        <button className="btn-primary" disabled={loading || userLoading || !usuarioId} onClick={doFetch}>
          {loading ? 'Consultando...' : 'Analizar Presupuestos'}
        </button>
        {data && (
          <button className="btn-secondary" onClick={()=>setShowRaw(s=>!s)}>
            {showRaw ? 'Ocultar JSON' : 'Ver JSON'}
          </button>
        )}
      </div>
      {error && <p className="error" style={{ marginBottom:'1rem' }}>{error}</p>}
      {!data && !loading && !error && (
        <div className="card" style={{ padding:'2rem', textAlign:'center' }}>
          <Icon name="list" size={40} style={{ color:'var(--text-tertiary)', marginBottom:'0.75rem' }} />
          <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>Pulsa "Analizar Presupuestos" para obtener el desglose y análisis.</p>
        </div>
      )}
      {loading && <p style={{ fontSize:'0.85rem' }}>Procesando petición...</p>}
      {data && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          {data.presupuestos && data.presupuestos.length > 0 && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <h3 style={{ margin:'0 0 1rem 0' }}>Presupuestos Verificados</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.9rem' }}>
                {data.presupuestos.map((p,i)=>{
                  const badge = estadoBadge(p.estado);
                  const pct = p.porcentaje || 0;
                  return (
                    <div key={i} className="card" style={{ padding:'0.75rem', display:'flex', flexDirection:'column', gap:'0.45rem', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                        <strong style={{ fontSize:'0.7rem', textTransform:'capitalize' }}>{p.categoria}</strong>
                        <span style={{ fontSize:'0.55rem', padding:'0.25rem 0.45rem', borderRadius:'999px', background:badge.bg, color:badge.color, fontWeight:600 }}>{badge.text}</span>
                      </div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Límite: <strong>{formatCurrency(p.limite)}</strong></div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-tertiary)' }}>Gastado: <strong style={{ color: pct>=100 ? 'var(--danger)' : pct>=75 ? 'var(--warning)' : 'var(--text-secondary)' }}>{formatCurrency(p.gastado)}</strong></div>
                      <div style={{ height:6, background:'var(--surface-2)', borderRadius:4, overflow:'hidden', marginTop:4 }}>
                        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: pct>=100 ? 'var(--danger)' : pct>=75 ? 'var(--warning)' : 'var(--secondary)', transition:'width .4s' }} />
                      </div>
                      <div style={{ fontSize:'0.55rem', color:'var(--text-tertiary)', display:'flex', justifyContent:'space-between' }}>
                        <span>{formatPercentage(pct)}</span>
                        <span>{p.estado}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:'0.6rem', marginTop:'0.75rem', color:'var(--text-tertiary)' }}>status: <strong>{data.status || '—'}</strong> • protocol: <strong>{data.protocol || '—'}</strong> • message_id: <strong>{data.message_id || '—'}</strong> • timestamp: <strong>{data.timestamp || '—'}</strong></div>
            </div>
          )}
          {data.analisis_ia && (
            <div className="card" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.8rem' }}>
              <h3 style={{ margin:0 }}>Narrativa IA</h3>
              <div style={{ fontSize:'0.68rem', lineHeight:1.4, background:'var(--surface-2)', padding:'0.8rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                {renderNarrativa(data.analisis_ia)}
              </div>
            </div>
          )}
          {data.recomendaciones && data.recomendaciones.length > 0 && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <h3 style={{ margin:'0 0 0.85rem 0' }}>Recomendaciones</h3>
              <ol style={{ margin:0, paddingLeft:'1rem', display:'flex', flexDirection:'column', gap:'0.55rem', fontSize:'0.7rem' }}>
                {data.recomendaciones.map((r,i)=>(
                  <li key={i} style={{ lineHeight:1.35, display:'flex', gap:'0.45rem' }}>
                    <Icon name="check" size={12} style={{ color:'var(--secondary)', marginTop:2 }} />
                    <span style={{ flex:1 }} dangerouslySetInnerHTML={{ __html: r.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
                  </li>
                ))}
              </ol>
            </div>
          )}
          {showRaw && (
            <div className="card" style={{ padding:'1rem' }}>
              <h3 style={{ margin:'0 0 0.6rem 0' }}>Raw JSON</h3>
              <pre style={{ maxHeight:360, overflow:'auto', fontSize:'0.6rem', background:'var(--surface-2)', padding:'0.75rem', borderRadius:'var(--radius-sm)' }}>{JSON.stringify(data.raw, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
