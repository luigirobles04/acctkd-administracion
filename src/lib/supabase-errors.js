/** Convierte errores Supabase/PostgREST a mensaje legible */
export function supabaseErrorMessage(error, fallback = 'Error en la operación') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  return (
    error.message ||
    error.details ||
    error.hint ||
    (error.code === '23505' ? 'Este registro ya existe (DNI o academia duplicada)' : null) ||
    (error.code ? `Error de base de datos (${error.code})` : null) ||
    fallback
  )
}

export function throwSupabase(error, fallback) {
  const msg = supabaseErrorMessage(error, fallback)
  console.error('[supabase]', fallback, error)
  throw new Error(msg)
}
