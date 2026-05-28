'use client'

import { MODALIDADES } from '@/lib/campeonato/constants'

export default function FiltroLineasAcademia({ filtro, onChange, total, filtradas, modalidades }) {
  const mods = modalidades?.length ? modalidades : []

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="ios-input"
        placeholder="Buscar nombre, dorsal, categoría…"
        style={{ flex: '1 1 180px', minWidth: 160, padding: '8px 12px', fontSize: 13 }}
        value={filtro.buscar || ''}
        onChange={(e) => onChange({ ...filtro, buscar: e.target.value })}
      />
      <select
        className="ios-input"
        style={{ flex: '0 1 160px', padding: '8px 12px', fontSize: 13 }}
        value={filtro.modalidad || 'todas'}
        onChange={(e) => onChange({ ...filtro, modalidad: e.target.value })}
      >
        <option value="todas">Todas las modalidades</option>
        {mods.map((m) => (
          <option key={m} value={m}>{MODALIDADES[m]?.label || m.replace(/_/g, ' ')}</option>
        ))}
      </select>
      {(filtro.buscar || (filtro.modalidad && filtro.modalidad !== 'todas')) && (
        <button
          type="button"
          className="ios-btn ios-btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => onChange({ buscar: '', modalidad: 'todas' })}
        >
          Limpiar
        </button>
      )}
      <span className="ios-caption" style={{ color: 'var(--label3)', marginLeft: 'auto' }}>
        {filtradas} de {total}
      </span>
    </div>
  )
}
