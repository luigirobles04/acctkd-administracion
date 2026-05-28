import { MODALIDADES, ROLES_OFICIAL, edadWT } from '@/lib/campeonato/constants'

function labelModalidad(modalidad) {
  if (modalidad === 'oficial') return 'Oficial'
  return MODALIDADES[modalidad]?.label || modalidad?.replace(/_/g, ' ') || '—'
}

function labelOficial(tipo) {
  return ROLES_OFICIAL.find((r) => r.value === tipo)?.label || tipo || 'Oficial'
}

function nombreParticipante(miembro) {
  const p = miembro?.perfil
  if (!p) return '—'
  return `${p.nombres || ''} ${p.apellidos || ''}`.trim() || '—'
}

function nombresLinea(linea) {
  return (linea.miembros || []).map(nombreParticipante).filter((n) => n !== '—').join(' · ') || '—'
}

function mapFilaCompetidor(linea, anioCampeonato) {
  const p = linea.miembros?.[0]?.perfil
  const edad = p?.fecha_nacimiento && anioCampeonato ? edadWT(p.fecha_nacimiento, anioCampeonato) : null
  return {
    dorsal: linea.dorsal_display || '—',
    nombre: nombresLinea(linea),
    documento: p?.documento_numero || '—',
    sexo: p?.sexo === 'M' ? 'M' : p?.sexo === 'F' ? 'F' : '—',
    grado: p?.grado || '—',
    edad: edad != null ? edad : '—',
    categoria: linea.categoria?.nombre || '—',
    peso: linea.peso_declarado != null ? `${linea.peso_declarado} kg` : '—',
    modalidad: labelModalidad(linea.modalidad),
    estado: linea.estado,
  }
}

function mapFilaOficial(linea) {
  const p = linea.miembros?.[0]?.perfil
  return {
    rol: labelOficial(linea.tipo_oficial),
    nombre: nombresLinea(linea),
    documento: p?.documento_numero || '—',
    estado: linea.estado,
  }
}

/** Datos de ficha nominal agrupados por academia */
export async function buildExportFichaNominal(sb, idCampeonato) {
  const { data: campeonato, error: errCamp } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, ciudad, lugar, fecha_inicio')
    .eq('id_campeonato', idCampeonato)
    .single()
  if (errCamp) throw errCamp

  const anioCampeonato = campeonato.fecha_inicio
    ? new Date(campeonato.fecha_inicio).getFullYear()
    : new Date().getFullYear()

  const [{ data: academias, error: errAc }, { data: lineas, error: errLi }] = await Promise.all([
    sb
      .from('academia_campeonato')
      .select(`
        id,
        estado_aprobacion,
        estado_lista,
        estado_pago,
        academia:id_academia(nombre, codigo_prefijo, representante_nombre, representante_dni, telefono, ciudad)
      `)
      .eq('id_campeonato', idCampeonato)
      .eq('estado_aprobacion', 'aprobada')
      .order('created_at', { ascending: true }),
    sb
      .from('linea_inscripcion')
      .select(`
        id_linea,
        id_academia_campeonato,
        modalidad,
        tipo_oficial,
        estado,
        dorsal_display,
        dorsal_numero,
        peso_declarado,
        categoria:categoria_campeonato(nombre),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos, documento_numero, sexo, grado, fecha_nacimiento))
      `)
      .eq('id_campeonato', idCampeonato)
      .in('estado', ['aprobado', 'pagado'])
      .order('dorsal_numero', { ascending: true, nullsFirst: false }),
  ])

  if (errAc) throw errAc
  if (errLi) throw errLi

  const academiasExport = (academias || []).map((ac) => {
    const lineasAc = (lineas || []).filter((l) => l.id_academia_campeonato === ac.id)
    const oficiales = lineasAc
      .filter((l) => l.modalidad === 'oficial')
      .map(mapFilaOficial)

    const lineasComp = lineasAc.filter((l) => l.modalidad !== 'oficial')
    const kyorugiRows = lineasComp.filter((l) => l.modalidad?.startsWith('kyorugi')).map((l) => mapFilaCompetidor(l, anioCampeonato))
    const poomsaeRows = lineasComp.filter((l) => l.modalidad?.startsWith('poomsae')).map((l) => mapFilaCompetidor(l, anioCampeonato))

    return {
      id: ac.id,
      nombre: ac.academia?.nombre || `Academia #${ac.id}`,
      codigo: ac.academia?.codigo_prefijo || '',
      representante: ac.academia?.representante_nombre || '—',
      representante_dni: ac.academia?.representante_dni || '—',
      telefono: ac.academia?.telefono || '—',
      ciudad: ac.academia?.ciudad || '—',
      estado_lista: ac.estado_lista,
      estado_pago: ac.estado_pago,
      kyorugi: kyorugiRows,
      poomsae: poomsaeRows,
      oficiales,
      total_competidores: kyorugiRows.length + poomsaeRows.length,
      total_oficiales: oficiales.length,
      total: kyorugiRows.length + poomsaeRows.length + oficiales.length,
    }
  }).filter((a) => a.total > 0)

  const totales = {
    academias: academiasExport.length,
    competidores: academiasExport.reduce((n, a) => n + a.total_competidores, 0),
    oficiales: academiasExport.reduce((n, a) => n + a.total_oficiales, 0),
    lineas: academiasExport.reduce((n, a) => n + a.total, 0),
  }

  return { campeonato, academias: academiasExport, totales, anioCampeonato }
}

export { nombreHojaExcel } from '@/lib/campeonato/export-llaves'
