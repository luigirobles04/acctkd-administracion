function nextPowerOf2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

function nombreLinea(l) {
  if (!l) return 'BYE'
  const m = l.miembros?.[0]?.perfil
  if (!m) return l.dorsal_display || `#${l.id_linea}`
  return `${l.dorsal_display || ''} ${m.nombres || ''} ${m.apellidos || ''}`.trim()
}

export async function generarLlaveCategoria(sb, idCampeonato, idCategoria) {
  const { data: cat } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, modalidad')
    .eq('id_categoria', idCategoria)
    .eq('id_campeonato', idCampeonato)
    .single()
  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.modalidad !== 'kyorugi') throw new Error('Solo categorías kyorugi')

  const { data: lineas, error } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, dorsal_display, dorsal_numero,
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
    `)
    .eq('id_campeonato', idCampeonato)
    .eq('id_categoria', idCategoria)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
    .order('dorsal_numero', { ascending: true })
  if (error) throw error

  const participantes = lineas || []
  if (participantes.length < 2) {
    throw new Error(`Se necesitan al menos 2 competidores con dorsal (hay ${participantes.length})`)
  }

  await sb.from('llave_kyorugi').delete().eq('id_categoria', idCategoria)

  const bracketSize = nextPowerOf2(participantes.length)
  const numRondas = Math.log2(bracketSize)
  const slots = [...participantes]
  while (slots.length < bracketSize) slots.push(null)

  const estructura = []
  for (let r = numRondas; r >= 1; r--) {
    const matchesEnRonda = 2 ** (r - 1)
    estructura.push({ ronda: r, count: matchesEnRonda })
  }

  const idsPorRonda = []

  for (let ri = 0; ri < estructura.length; ri++) {
    const { ronda, count } = estructura[ri]
    idsPorRonda[ri] = []
    for (let m = 1; m <= count; m++) {
      let id_linea1 = null
      let id_linea2 = null
      let es_bye = false
      let ganador_id_linea = null
      let estado = 'pendiente'

      if (ri === 0) {
        const p1 = slots[(m - 1) * 2]
        const p2 = slots[(m - 1) * 2 + 1]
        id_linea1 = p1?.id_linea || null
        id_linea2 = p2?.id_linea || null
        if (!p1 || !p2) {
          es_bye = true
          ganador_id_linea = (p1 || p2)?.id_linea || null
          estado = 'bye'
        }
      }

      const { data: ins, error: errI } = await sb
        .from('llave_kyorugi')
        .insert({
          id_campeonato: idCampeonato,
          id_categoria: idCategoria,
          ronda,
          match_numero: m,
          id_linea1,
          id_linea2,
          es_bye,
          ganador_id_linea,
          estado,
        })
        .select()
        .single()
      if (errI) throw errI
      idsPorRonda[ri].push(ins.id_llave)
    }
  }

  for (let ri = 0; ri < idsPorRonda.length - 1; ri++) {
    for (let mi = 0; mi < idsPorRonda[ri].length; mi++) {
      const idActual = idsPorRonda[ri][mi]
      const idSiguiente = idsPorRonda[ri + 1][Math.floor(mi / 2)]
      await sb.from('llave_kyorugi').update({ siguiente_llave: idSiguiente }).eq('id_llave', idActual)

      const { data: match } = await sb.from('llave_kyorugi').select('*').eq('id_llave', idActual).single()
      if (match?.ganador_id_linea && idSiguiente) {
        const { data: sig } = await sb.from('llave_kyorugi').select('*').eq('id_llave', idSiguiente).single()
        const patch = {}
        if (!sig.id_linea1) patch.id_linea1 = match.ganador_id_linea
        else if (!sig.id_linea2) patch.id_linea2 = match.ganador_id_linea
        if (Object.keys(patch).length) {
          await sb.from('llave_kyorugi').update(patch).eq('id_llave', idSiguiente)
        }
      }
    }
  }

  return {
    categoria: cat.nombre,
    participantes: participantes.length,
    combates: idsPorRonda.flat().length,
    rondas: numRondas,
  }
}

export { nombreLinea }
