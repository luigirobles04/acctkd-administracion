import bcrypt from 'bcryptjs'

const USER_KEY = 'acctkd_user'
const SESSION_KEY = 'acctkd_session'

export async function login(identificador, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador, password }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Credenciales incorrectas')

  localStorage.setItem(USER_KEY, JSON.stringify(json.user))
  localStorage.setItem(SESSION_KEY, json.sessionToken)
  return json.user
}

export async function registerAcademia(payload) {
  const res = await fetch('/api/auth/registro-academia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error en registro')

  localStorage.setItem(USER_KEY, JSON.stringify(json.user))
  localStorage.setItem(SESSION_KEY, json.sessionToken)
  return json
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

export function getSessionToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

export function logout() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(SESSION_KEY)
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

export function isRepresentante(user) {
  return rolNombre(user) === 'representante'
}

export function isOrganizador(user) {
  return rolNombre(user) === 'organizador'
}
