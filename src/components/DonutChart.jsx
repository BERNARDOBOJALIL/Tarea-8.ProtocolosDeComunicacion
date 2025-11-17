import React from 'react';

// Donut chart using CSS conic-gradient. Slices: [{ value: number, color: string, label?: string }]
export default function DonutChart({ slices, size = 200, thickness = 24, center, ariaLabel = 'Donut chart' }) {
  const total = Math.max(1, (slices || []).reduce((a, s) => a + (Number(s.value) || 0), 0));
  let acc = 0;
  const gradients = (slices || []).map((s, idx) => {
    const start = (acc / total) * 100;
    const end = ((acc + (Number(s.value) || 0)) / total) * 100;
    acc += Number(s.value) || 0;
    return `${s.color} ${start}% ${end}%`;
  }).join(', ');

  const outer = size;
  const inner = Math.max(0, size - thickness * 2);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-label={ariaLabel}>
      <div
        style={{
          width: outer,
          height: outer,
          borderRadius: '50%',
          background: `conic-gradient(${gradients})`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: inner,
            height: inner,
            borderRadius: '50%',
            background: 'var(--bg, #0b1220)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0.25rem',
          }}
        >
          {center}
        </div>
      </div>
    </div>
  );
}
