import { MODALIDADES } from '@/lib/campeonato/constants'
import {
  categoriasValidas,
  categoriasPoomsaeValidas,
  modalidadRequiereCategoriaPoomsae,
} from '@/lib/campeonato/validar-categoria'
import { validarGrupoInscripcion, esModalidadGrupo } from '@/lib/campeonato/validar-grupo'

/** Valida línea individual antes de insertar (servidor) */
export async function validarLineaInscripcion(sb, ac, body) {
  const { modalidad, idPerfiles, idCategoria, pesoDeclarado } = body
  const mod = MODALIDADES?.[modalidad]

  if (modalidad === 'oficial') return
  if (esModalidadGrupo(modalidad)) {
    return validarGrupoInscripcion(sb, ac, body)
  }

  if (!mod) throw new Error('Modalidad inválida')
  if (!idPerfiles?.length) throw new Error('Perfil requerido')

  const necesitaCategoria =
    modalidad === 'kyorugi_individual' || modalidadRequiereCategoriaPoomsae(modalidad)
  if (necesitaCategoria && !idCategoria) {
    throw new Error('Debes elegir una categoría')
  }

  if (!idCategoria) return

  const { data: cat, error: errCat } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_categoria', idCategoria)
    .eq('id_campeonato', ac.id_campeonato)
    .maybeSingle()
  if (errCat) throw errCat
  if (!cat) throw new Error('Categoría inválida para este campeonato')

  const { data: perfil } = await sb
    .from('competidor_perfil')
    .select('*')
    .eq('id_perfil', idPerfiles[0])
    .maybeSingle()
  if (!perfil) throw new Error('Competidor no encontrado')

  const anio = new Date(ac.campeonato.fecha_inicio).getFullYear()
  if (modalidad === 'kyorugi_individual') {
    const validas = categoriasValidas([cat], perfil, anio, pesoDeclarado)
    if (!validas.length) throw new Error('La categoría kyorugi no calza con edad, sexo, peso o grado')
  } else if (modalidadRequiereCategoriaPoomsae(modalidad)) {
    const validas = categoriasPoomsaeValidas([cat], perfil, anio)
    if (!validas.length) throw new Error('La división poomsae no calza con edad, sexo o grado')
  }
}
