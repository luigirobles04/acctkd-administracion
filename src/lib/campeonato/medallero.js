/** Medallero por academia y ranking de atletas (kyorugi + poomsae) */

const DEFAULT_PUNTOS = { oro: 120, plata: 50, bronce: 20 }

function puntosCampeonato(camp) {
  return {
    oro: Number(camp?.puntos_oro) || DEFAULT_PUNTOS.oro,
    plata: Number(camp?.puntos_plata) || DEFAULT_PUNTOS.plata,
    bronce: Number(camp?.puntos_bronce) || DEFAULT_PUNTOS.bronce,
  }
}

function medallasDePodio(podio) {
  if (!podio) return []
  const out = []
  if (podio.oro?.id_linea) out.push({ tipo: 'oro', competidor: podio.oro })
  if (podio.plata?.id_linea) out.push({ tipo: 'plata', competidor: podio.plata })
  for (const b of podio.bronce || []) {
    if (b?.id_linea) out.push({ tipo: 'bronce', competidor: b })
  }
  return out
}

function keyAcademia(nombre) {
  return (nombre || 'Sin academia').trim() || 'Sin academia'
}

function acumularMedallas(acum, podios, modalidad, puntos) {
  for (const cat of podios || []) {
    if (cat.estado !== 'completo' || !cat.podio) continue
    for (const { tipo, competidor } of medallasDePodio(cat.podio)) {
      const pts = puntos[tipo] || 0
      const acadKey = keyAcademia(competidor.academia)
      const athKey = String(competidor.id_linea)

      if (!acum.academias.has(acadKey)) {
        acum.academias.set(acadKey, {
          nombre: acadKey,
          puntos_kyorugi: 0,
          puntos_poomsae: 0,
          puntos_total: 0,
          oro: 0,
          plata: 0,
          bronce: 0,
        })
      }
      const ac = acum.academias.get(acadKey)
      ac[tipo] += 1
      if (modalidad === 'kyorugi') ac.puntos_kyorugi += pts
      else ac.puntos_poomsae += pts
      ac.puntos_total += pts

      if (!acum.atletas.has(athKey)) {
        acum.atletas.set(athKey, {
          id_linea: competidor.id_linea,
          dorsal: competidor.dorsal,
          nombres: competidor.nombres,
          academia: competidor.academia,
          oro: 0,
          plata: 0,
          bronce: 0,
          puntos: 0,
          kyorugi: 0,
          poomsae: 0,
        })
      }
      const at = acum.atletas.get(athKey)
      at[tipo] += 1
      at.puntos += pts
      if (modalidad === 'kyorugi') at.kyorugi += pts
      else at.poomsae += pts
    }
  }
}

function topN(lista, n, key) {
  return [...lista].sort((a, b) => b[key] - a[key]).slice(0, n)
}

/**
 * @param {{ kyorugi: { podios }, poomsae: { podios }, campeonato }} input
 */
export function buildMedallero({ kyorugi, poomsae, campeonato }) {
  const puntos = puntosCampeonato(campeonato)
  const acum = { academias: new Map(), atletas: new Map() }

  acumularMedallas(acum, kyorugi?.podios, 'kyorugi', puntos)
  acumularMedallas(acum, poomsae?.podios, 'poomsae', puntos)

  const academias = [...acum.academias.values()]
  const atletas = [...acum.atletas.values()]

  const academiasKyorugi = topN(academias.filter((a) => a.puntos_kyorugi > 0), 3, 'puntos_kyorugi')
  const academiasPoomsae = topN(academias.filter((a) => a.puntos_poomsae > 0), 3, 'puntos_poomsae')
  const academiasGlobal = topN(academias.filter((a) => a.puntos_total > 0), 3, 'puntos_total')

  const atletasKyorugi = topN(atletas.filter((a) => a.kyorugi > 0), 10, 'kyorugi').slice(0, 5)
  const atletasPoomsae = topN(atletas.filter((a) => a.poomsae > 0), 10, 'poomsae').slice(0, 5)
  const atletasGlobal = topN(atletas.filter((a) => a.puntos > 0), 10, 'puntos').slice(0, 5)

  return {
    puntos,
    academias: {
      kyorugi: academiasKyorugi,
      poomsae: academiasPoomsae,
      global: academiasGlobal,
      totalAcademias: academias.length,
    },
    atletas: {
      kyorugi: atletasKyorugi,
      poomsae: atletasPoomsae,
      global: atletasGlobal,
    },
    resumen: {
      medallasKyorugi: (kyorugi?.podios || []).filter((p) => p.estado === 'completo').length,
      medallasPoomsae: (poomsae?.podios || []).filter((p) => p.estado === 'completo').length,
    },
  }
}
