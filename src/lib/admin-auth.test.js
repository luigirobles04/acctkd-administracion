import { describe, it, expect, afterEach, vi } from 'vitest'
import { createSessionToken, verifySessionToken } from '@/lib/auth-session'
import { verifySessionTokenEdge } from '@/lib/auth-session-edge'
import { rolPermitido } from '@/lib/admin-roles'
import { opsKeyValida } from '@/lib/admin-auth'

describe('admin auth', () => {
  const user = { id_usuario: 1, rol: 'admin_campeonato', id_academia: null }

  it('edge verify acepta token creado en Node', async () => {
    const token = createSessionToken(user)
    expect(verifySessionToken(token)).toMatchObject({ id_usuario: 1, rol: 'admin_campeonato' })
    const edge = await verifySessionTokenEdge(token)
    expect(edge).toMatchObject({ id_usuario: 1, rol: 'admin_campeonato' })
  })

  it('rolPermitido por scope', () => {
    expect(rolPermitido('admin', 'full')).toBe(true)
    expect(rolPermitido('admin_campeonato', 'full')).toBe(false)
    expect(rolPermitido('admin_campeonato', 'panel')).toBe(true)
    expect(rolPermitido('arbitro_mesa', 'panel')).toBe(false)
    expect(rolPermitido('arbitro_mesa', 'arbitro')).toBe(true)
  })

  it('rechaza token inválido', async () => {
    expect(await verifySessionTokenEdge('bad.token')).toBeNull()
  })
})

describe('fail-closed en producción', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sin SESSION_SECRET en producción: no crea ni verifica tokens', async () => {
    const user = { id_usuario: 1, rol: 'admin', id_academia: null }
    const token = createSessionToken(user) // creado con secreto dev

    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_SECRET', '')
    expect(verifySessionToken(token)).toBeNull()
    expect(await verifySessionTokenEdge(token)).toBeNull()
    expect(() => createSessionToken(user)).toThrow(/SESSION_SECRET/)
  })

  it('no acepta tokens firmados con CRON_SECRET (sin fallback cruzado)', async () => {
    vi.stubEnv('SESSION_SECRET', 'secreto-sesion-dedicado')
    vi.stubEnv('CRON_SECRET', 'secreto-cron')
    const token = createSessionToken({ id_usuario: 1, rol: 'admin' })
    expect(verifySessionToken(token)).toMatchObject({ rol: 'admin' })

    vi.stubEnv('SESSION_SECRET', 'otro-secreto')
    expect(verifySessionToken(token)).toBeNull()
  })

  it('opsKeyValida exige ACCTKD_OPS_KEY dedicada (no CRON_SECRET)', () => {
    vi.stubEnv('ACCTKD_OPS_KEY', '')
    vi.stubEnv('CRON_SECRET', 'secreto-cron')
    expect(opsKeyValida('secreto-cron')).toBe(false)

    vi.stubEnv('ACCTKD_OPS_KEY', 'clave-ops')
    expect(opsKeyValida('clave-ops')).toBe(true)
    expect(opsKeyValida('otra')).toBe(false)
    expect(opsKeyValida('')).toBe(false)
  })
})
