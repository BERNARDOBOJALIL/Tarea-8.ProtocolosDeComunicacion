import React from 'react';
import { Icon } from './Icon';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'transacciones', label: 'Transacciones', icon: 'creditCard' },
  { key: 'presupuestos', label: 'Presupuestos', icon: 'pieChart' },
  { key: 'analisis', label: 'Análisis IA', icon: 'brain' },
  { key: 'sistema', label: 'Sistema', icon: 'activity' },
];

export function NavTabs({ active, onChange }) {
  return (
    <nav className="tabs">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`tab-btn ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          <Icon name={t.icon} size={18} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default NavTabs;