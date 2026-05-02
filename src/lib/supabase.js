import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20

export const supabase = (isValidUrl && isValidKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/** Cliente anon; lanza mensaje usable en UI si faltan env vars */
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return supabase
}
