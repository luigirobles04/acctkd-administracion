import { createClient } from '@supabase/supabase-js'

/** Cliente Supabase con service role (solo servidor / API routes) */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase admin: faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Supabase/PostgREST devuelve como máximo ~1000 filas por consulta. */
export const SUPABASE_PAGE_SIZE = 1000

/**
 * Ejecuta una consulta paginada con .range() hasta agotar resultados.
 * `buildQuery` recibe el cliente y debe devolver la query ya filtrada/ordenada (sin .range).
 */
export async function fetchAllSupabaseRows(sb, buildQuery, pageSize = SUPABASE_PAGE_SIZE) {
  const all = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery(sb).range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
