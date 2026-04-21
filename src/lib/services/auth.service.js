import { supabase } from '../supabase'
import bcrypt from 'bcryptjs'

const USER_KEY = 'acctkd_user'

export async function login(username, password) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('id_usuario, username, password_hash, id_rol, activo, email, nombre_completo, rol(nombre)')
    .eq('username', username)
    .eq('activo', true)
    .single()

  if (error || !usuario) throw new Error('Usuario no encontrado o inactivo')

  const passwordOk = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordOk) throw new Error('Contraseña incorrecta')

  await supabase
    .from('usuario')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('id_usuario', usuario.id_usuario)

  const rolNombre = usuario.rol?.nombre || null
  const userData = {
    id_usuario: usuario.id_usuario,
    username: usuario.username,
    email: usuario.email || null,
    nombre: usuario.nombre_completo || usuario.username,
    id_rol: usuario.id_rol,
    rol: rolNombre,
  }

  localStorage.setItem(USER_KEY, JSON.stringify(userData))
  return userData
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(USER_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(USER_KEY)
}

function rolNombre(user) {
  if (!user) return null
  if (typeof user.rol === 'string') return user.rol
  return user.rol?.nombre || null
}

export function isAdmin(user) {
  return rolNombre(user) === 'admin' || user?.id_rol === 1
}

export function isMaestro(user) {
  return rolNombre(user) === 'maestro' || user?.id_rol === 2
}

export function isAlumno(user) {
  return rolNombre(user) === 'alumno' || user?.id_rol === 3
}
