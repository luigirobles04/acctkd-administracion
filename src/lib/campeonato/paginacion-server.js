/**
 * Paginación server-side para endpoints admin.
 * Clampa page/limit para que un query param malicioso o erróneo
 * nunca produzca rangos inválidos ni respuestas gigantes.
 */
export function parsePaginacion(searchParams, { limitDefecto = 50, limitMax = 200 } = {}) {
  const pageRaw = Number(searchParams?.get?.('page'))
  const limitRaw = Number(searchParams?.get?.('limit'))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1
  const limitBase = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.trunc(limitRaw) : limitDefecto
  const limit = Math.min(limitMax, limitBase)
  const desde = (page - 1) * limit
  const hasta = desde + limit - 1
  return { page, limit, desde, hasta }
}

export function totalPaginas(total, limit) {
  return Math.max(1, Math.ceil(Number(total || 0) / Math.max(1, Number(limit || 1))))
}
