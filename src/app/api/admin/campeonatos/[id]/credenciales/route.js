import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'
import { credencialTemplateSrc } from '@/lib/campeonato/credencial-layout'

function mapCanchaPorLinea(llaves) {
  const canchaPorLinea = {}
  for (const l of llaves || []) {
    if (!l.cancha) continue
    for (const idLinea of [l.id_linea1, l.id_linea2]) {
      if (!idLinea) continue
      const prev = canchaPorLinea[idLinea]
      if (!prev || l.ronda > prev.ronda) {
        canchaPorLinea[idLinea] = { cancha: l.cancha, ronda: l.ronda }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(canchaPorLinea).map(([id, v]) => [Number(id), v.cancha])
  )
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const [{ data: campeonato, error: errCamp }, { data: lineas, error }, { data: llaves }] = await Promise.all([
      sb
        .from('campeonato')
        .select('id_campeonato, nombre, ciudad, lugar, dias_evento, fecha_inicio, template_competidor_url, credencial_layout')
        .eq('id_campeonato', idCampeonato)
        .single(),
      sb
        .from('linea_inscripcion')
        .select(`
          id_linea, dorsal_display, dorsal_numero, modalidad, id_academia_campeonato,
          categoria:categoria_campeonato(nombre),
          academia_campeonato(
            id,
            academia(id_academia, nombre, codigo_prefijo)
          ),
          miembros:linea_inscripcion_miembro(
            perfil:competidor_perfil(id_perfil, nombres, apellidos, foto_url, documento_numero)
          )
        `)
        .eq('id_campeonato', idCampeonato)
        .eq('estado', 'aprobado')
        .not('dorsal_numero', 'is', null)
        .order('dorsal_numero', { ascending: true }),
      sb
        .from('llave_kyorugi')
        .select('id_linea1, id_linea2, cancha, ronda')
        .eq('id_campeonato', idCampeonato)
        .not('cancha', 'is', null),
    ])

    if (errCamp) throw errCamp
    if (error) throw error

    const canchaPorLinea = mapCanchaPorLinea(llaves)

    const competidores = (lineas || []).map((l) => {
      const p = l.miembros?.[0]?.perfil
      const ac = l.academia_campeonato?.academia
      return {
        id_linea: l.id_linea,
        id_academia_campeonato: l.id_academia_campeonato,
        id_academia: ac?.id_academia || l.academia_campeonato?.id || l.id_academia_campeonato,
        codigo_academia: ac?.id_academia ?? ac?.codigo_prefijo ?? '',
        dorsal: l.dorsal_display,
        dorsal_numero: l.dorsal_numero,
        nombres: p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim().toUpperCase() : '',
        foto_url: fotoCompetidorProxyUrl(p?.foto_url) || null,
        documento: p?.documento_numero || '',
        categoria: l.categoria?.nombre || '',
        academia: ac?.nombre || '',
        modalidad: l.modalidad,
        cancha: canchaPorLinea[l.id_linea] || null,
        qr_data: l.dorsal_display || String(l.dorsal_numero || l.id_linea),
      }
    })

    const academiasMap = new Map()
    for (const c of competidores) {
      const key = c.id_academia_campeonato
      if (!academiasMap.has(key)) {
        academiasMap.set(key, {
          id_academia_campeonato: key,
          id_academia: c.id_academia,
          codigo_academia: c.codigo_academia,
          nombre: c.academia,
          competidores: [],
        })
      }
      academiasMap.get(key).competidores.push(c)
    }

    const academias = [...academiasMap.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    )

    const templateUrl = credencialTemplateSrc(campeonato?.template_competidor_url)

    return NextResponse.json({
      campeonato: campeonato
        ? { ...campeonato, template_url: templateUrl }
        : campeonato,
      competidores,
      academias,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
