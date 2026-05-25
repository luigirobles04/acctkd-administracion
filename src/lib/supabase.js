import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20

export function isSupabaseConfigured() {
  return Boolean(isValidUrl && isValidKey)
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/** Cliente anon; lanza mensaje usable en UI si faltan env vars */
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado: en Vercel agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY, luego redeploy.'
    )
  }
  return supabase
}
