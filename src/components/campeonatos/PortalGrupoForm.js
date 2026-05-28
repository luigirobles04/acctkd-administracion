'use client'

import { useMemo, useState, useEffect } from 'react'
import { MODALIDADES, edadWT } from '@/lib/campeonato/constants'
import { PortalField, PortalCategoriaPicker } from '@/components/campeonatos/PortalInscripcion'
import { categoriasPoomsaeGrupo, validarComposicionGrupo } from '@/lib/campeonato/validar-grupo'
import { portalFetch } from '@/lib/portal-client'

export const MODALIDADES_GRUPO = [
  {
    key: 'poomsae_pareja_reconocida',
    label: 'Pareja reconocida',
    desc: '2 competidores · misma división · mixta o mismo sexo',
    icon: 'group',
  },
  {
    key: 'poomsae_pareja_freestyle',
    label: 'Pareja freestyle',
    desc: '2 competidores · exactamente 1 M + 1 F',
    icon: 'groups',
  },
  {
    key: 'poomsae_equipo',
    label: 'Equipo WT',
    desc: '3 competidores · mismo sexo · misma división',
    icon: 'diversity_3',
  },
]

function perfilLabel(p, anio) {
  const edad = edadWT(p.fecha_nacimiento, anio)
  return `${p.nombres} ${p.apellidos} · ${p.sexo === 'M' ? 'M' : 'F'} · ${edad ?? '?'} años · ${p.grado}`
}

export default function PortalGrupoForm({ slug, perfiles, categorias, anioCampeonato, onSuccess, onCancel, disabled = false }) {
  const [modalidad, setModalidad] = useState('poomsae_pareja_reconocida')
  const [selectedIds, setSelectedIds] = useState([])
  const [idCategoria, setIdCategoria] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const miembros = MODALIDADES[modalidad]?.miembros || 2

  const selectedPerfiles = useMemo(
    () => selectedIds.map((id) => perfiles.find((p) => p.id_perfil === id)).filter(Boolean),
    [selectedIds, perfiles]
  )

  const compError = useMemo(() => {
    if (selectedPerfiles.length !== miembros) return null
    return validarComposicionGrupo(selectedPerfiles, modalidad)
  }, [selectedPerfiles, modalidad, miembros])

  const catsGrupo = useMemo(() => {
    if (selectedPerfiles.length !== miembros) return []
    if (compError && !compError.ok) return []
    return categoriasPoomsaeGrupo(categorias, selectedPerfiles, anioCampeonato, modalidad)
  }, [categorias, selectedPerfiles, anioCampeonato, modalidad, miembros, compError])

  useEffect(() => {
    if (catsGrupo.length === 1) {
      setIdCategoria(String(catsGrupo[0].id_categoria))
    }
  }, [catsGrupo])

  function togglePerfil(id) {
    setIdCategoria('')
    setError(null)
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= miembros) return prev
      return [...prev, id]
    })
  }

  function cambiarModalidad(key) {
    setModalidad(key)
    setSelectedIds([])
    setIdCategoria('')
    setError(null)
  }

  async function confirmar(e) {
    e.preventDefault()
    if (disabled) return
    setSubmitting(true)
    setError(null)
    try {
      if (selectedIds.length !== miembros) {
        throw new Error(`Selecciona ${miembros} competidores`)
      }
      if (!idCategoria) throw new Error('Elige la división poomsae')

      const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
        method: 'POST',
        body: JSON.stringify({
          accion: 'crear_grupo',
          modalidad,
          idPerfiles: selectedIds,
          idCategoria: Number(idCategoria),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!perfiles?.length) {
    return (
      <p className="portal-empty">
        Inscribe competidores individuales primero. Luego podrás armar parejas y equipos aquí.
      </p>
    )
  }

  return (
    <form onSubmit={confirmar} className="portal-grupo-form">
      <p className="portal-section-lead" style={{ marginTop: 0 }}>
        Elige modalidad, selecciona integrantes del plantel y la división poomsae común.
      </p>

      <PortalField label="Modalidad">
        <div className="portal-grupo-mod-grid">
          {MODALIDADES_GRUPO.map(({ key, label, desc, icon }) => (
            <button
              key={key}
              type="button"
              className={`portal-grupo-mod ${modalidad === key ? 'portal-grupo-mod--active' : ''}`}
              onClick={() => cambiarModalidad(key)}
              disabled={disabled}
            >
              <span className="material-symbols-rounded">{icon}</span>
              <span className="portal-grupo-mod-title">{label}</span>
              <span className="portal-grupo-mod-desc">{desc}</span>
            </button>
          ))}
        </div>
      </PortalField>

      <PortalField label={`Integrantes (${selectedIds.length}/${miembros})`}>
        <div className="portal-grupo-members">
          {perfiles.map((p) => {
            const checked = selectedIds.includes(p.id_perfil)
            const full = !checked && selectedIds.length >= miembros
            return (
              <label
                key={p.id_perfil}
                className={`portal-grupo-member ${checked ? 'portal-grupo-member--on' : ''} ${full ? 'portal-grupo-member--dim' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || full}
                  onChange={() => togglePerfil(p.id_perfil)}
                />
                <span>{perfilLabel(p, anioCampeonato)}</span>
              </label>
            )
          })}
        </div>
      </PortalField>

      {compError && !compError.ok && selectedPerfiles.length === miembros && (
        <p className="portal-alert portal-alert--warn">{compError.reason}</p>
      )}

      {selectedPerfiles.length === miembros && (!compError || compError.ok) && (
        <PortalField label="División poomsae (común para todos)">
          <PortalCategoriaPicker
            categorias={catsGrupo}
            value={idCategoria}
            onChange={setIdCategoria}
            emptyMessage="No hay división común para estos integrantes. Revisa edad, sexo o grado."
            grouped
          />
        </PortalField>
      )}

      {error && <p className="portal-error">{error}</p>}

      <div className="portal-actions">
        <button type="button" className="ios-btn ios-btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button
          type="submit"
          className="ios-btn ios-btn-primary"
          disabled={disabled || submitting || selectedIds.length !== miembros || !idCategoria}
        >
          {submitting ? 'Inscribiendo…' : `Inscribir ${MODALIDADES[modalidad]?.label || 'grupo'}`}
        </button>
      </div>
    </form>
  )
}
