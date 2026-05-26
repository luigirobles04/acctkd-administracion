/** Prefijo dorsal automático por iniciales del nombre de academia */

const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'taekwondo', 'tkd', 'academy', 'academia', 'club', 'team'])

export function inicialesAcademia(nombre) {
  const palabras = String(nombre)
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !STOP.has(p.toLowerCase()))

  if (palabras.length === 0) return 'AC'

  if (palabras.length === 1) {
    return palabras[0].replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'AC'
  }

  return palabras
    .slice(0, 3)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export async function resolverPrefijoUnico(sb, base) {
  let prefijo = inicialesAcademia(base)
  if (prefijo.length < 2) prefijo = 'AC'

  const { data } = await sb.from('academia').select('codigo_prefijo').ilike('codigo_prefijo', `${prefijo}%`)

  const existentes = new Set((data || []).map((r) => r.codigo_prefijo))
  if (!existentes.has(prefijo)) return prefijo

  for (let n = 2; n < 100; n++) {
    const candidato = `${prefijo}${n}`
    if (!existentes.has(candidato)) return candidato
  }
  return `${prefijo}${Date.now().toString(36).slice(-2).toUpperCase()}`
}

export function formatearDorsal(prefijo, numero) {
  return `${prefijo}-${String(numero).padStart(2, '0')}`
}
