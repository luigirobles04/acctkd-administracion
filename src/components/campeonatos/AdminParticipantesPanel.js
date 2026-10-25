'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin-client'
import LoadingState, { ErrorState } from '@/components/ui/LoadingState'
import Paginacion from '@/components/ui/Paginacion'
import { MODALIDADES } from '@/lib/campeonato/constants'
import { nombreParticipanteLinea } from '@/lib/campeonato/agrupar-academias'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'

const FILTRO_VACIO = { dni: '', nombre: '', dorsal: '', academia: '', modalidad: 'todas' }

export default function AdminParticipantesPanel({
  idCampeonato,
  reloadKey = 0,
  onEditarPerfil,
  onEditarLinea,
  onAnularLinea,
}) {
  const [filtro, setFiltro] = useState(FILTRO_VACIO)
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VACIO)
  const [lineas, setLineas] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    if (!idCampeonato) return
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams({
        page: String(pagina),
        limit: '50',
        modalidad: filtroAplicado.modalidad || 'todas',
      })
      if (filtroAplicado.dni) p.set('dni', filtroAplicado.dni)
      if (filtroAplicado.nombre) p.set('nombre', filtroAplicado.nombre)
      if (filtroAplicado.dorsal) p.set('dorsal', filtroAplicado.dorsal)
      if (filtroAplicado.academia) p.set('academia', filtroAplicado.academia)

      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/participantes?${p}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al cargar participantes')
      setLineas(json.lineas || [])
      setTotal(json.total ?? 0)
      setTotalPaginas(json.totalPaginas ?? 1)
    } catch (e) {
      setError(e.message)
      setLineas([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato, pagina, filtroAplicado])

  useEffect(() => {
    cargar()
  }, [cargar, reloadKey])

  function aplicarFiltros(e) {
    e?.preventDefault?.()
    setPagina(1)
    setFiltroAplicado({ ...filtro })
  }

  function limpiarFiltros() {
    setFiltro(FILTRO_VACIO)
    setFiltroAplicado(FILTRO_VACIO)
    setPagina(1)
  }

  return (
    <div className="ios-card" style={{ padding: 16 }}>
      <p className="ios-headline" style={{ marginBottom: 4 }}>Participantes del campeonato</p>
      <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 14 }}>
        Misma data que portal, festival, poomsae, llaves y credenciales. Edita categoría, datos o anula la inscripción.
      </p>

      <form onSubmit={aplicarFiltros} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 12 }}>
        <input className="ios-input" placeholder="DNI / documento" value={filtro.dni} onChange={(e) => setFiltro({ ...filtro, dni: e.target.value })} />
        <input className="ios-input" placeholder="Nombre o apellido" value={filtro.nombre} onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })} />
        <input className="ios-input" placeholder="Dorsal (ej. U-C-64)" value={filtro.dorsal} onChange={(e) => setFiltro({ ...filtro, dorsal: e.target.value })} />
        <input className="ios-input" placeholder="Academia" value={filtro.academia} onChange={(e) => setFiltro({ ...filtro, academia: e.target.value })} />
        <select className="ios-input" value={filtro.modalidad} onChange={(e) => setFiltro({ ...filtro, modalidad: e.target.value })}>
          <option value="todas">Todas las modalidades</option>
          {Object.entries(MODALIDADES).map(([key, m]) => (
            <option key={key} value={key}>{m.label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="ios-btn ios-btn-primary">Filtrar</button>
          <button type="button" className="ios-btn ios-btn-secondary" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </form>

      <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 10 }}>
        {total} inscripción(es) activa(s)
      </p>

      {loading ? (
        <LoadingState mensaje="Cargando participantes…" padding={20} />
      ) : error ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--separator)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', width: 52 }}>Foto</th>
                  <th style={{ padding: '8px 6px' }}>Dorsal</th>
                  <th style={{ padding: '8px 6px' }}>Competidor</th>
                  <th style={{ padding: '8px 6px' }}>Academia</th>
                  <th style={{ padding: '8px 6px' }}>Modalidad</th>
                  <th style={{ padding: '8px 6px' }}>Categoría / peso</th>
                  <th style={{ padding: '8px 6px' }}>Estado</th>
                  <th style={{ padding: '8px 6px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const p = l.miembros?.[0]?.perfil
                  const foto = fotoCompetidorProxyUrl(p?.foto_url)
                  return (
                    <tr key={l.id_linea} style={{ borderBottom: '1px solid var(--separator)' }}>
                      <td style={{ padding: '8px 6px' }}>
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={foto} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: 'var(--fill-secondary)' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--fill-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label3)', fontSize: 11 }}>
                            —
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--red)' }}>{l.dorsal_display || '—'}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <div>{nombreParticipanteLinea(l)}</div>
                        {p && (
                          <div className="ios-caption" style={{ color: 'var(--label3)', marginTop: 2 }}>
                            {p.documento_tipo} {p.documento_numero} · {p.grado} · {p.sexo === 'F' ? 'F' : 'M'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{l.academia_campeonato?.academia?.nombre || '—'}</td>
                      <td style={{ padding: '8px 6px' }}>{MODALIDADES[l.modalidad]?.label || l.modalidad?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {l.modalidad === 'festival'
                          ? (l.peso_declarado ? `${l.peso_declarado} kg · Festival` : 'Festival')
                          : (l.categoria?.nombre || '—')}
                        {l.peso_declarado && l.modalidad === 'kyorugi_individual' ? ` · ${l.peso_declarado} kg` : null}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <span className={`badge ${l.estado === 'aprobado' ? 'badge-green' : l.estado === 'pagado' ? 'badge-blue' : 'badge-yellow'}`} style={{ fontSize: 10 }}>
                          {l.estado?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        {p && (
                          <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }} onClick={() => onEditarPerfil(l)}>
                            Datos
                          </button>
                        )}
                        <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }} onClick={() => onEditarLinea(l)}>
                          Categoría
                        </button>
                        <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--red)' }} onClick={() => onAnularLinea(l)}>
                          Anular
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {lineas.length === 0 && (
              <p style={{ padding: 16, textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>Sin resultados</p>
            )}
          </div>
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} total={total} porPagina={50} />
        </>
      )}
    </div>
  )
}
