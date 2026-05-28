/**
 * Genera SQL bulk para pagos/comprobantes/dorsales realistas (10 escenarios).
 * Ejecutar el SQL generado vía Supabase MCP o SQL Editor.
 *
 *   node scripts/realizar-simulacion.mjs
 *   → scripts/.simulacion/realismo.sql
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SLUG = 'simulacion-10x40-2026'

for (const f of ['.env.vercel', '.env.local']) {
  const p = join(root, f)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (val) process.env[m[1].trim()] = val
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ESCENARIOS = [
  { label: '100% + dorsales', pct: 1, validado: true, lista: 'enviada', dorsal: true },
  { label: '100% + dorsales', pct: 1, validado: true, lista: 'enviada', dorsal: true },
  { label: '100% + dorsales', pct: 1, validado: true, lista: 'enviada', dorsal: true },
  { label: '100% sin dorsales (cola admin)', pct: 1, validado: true, lista: 'enviada', dorsal: false },
  { label: '68% parcial', pct: 0.68, validado: true, lista: 'enviada' },
  { label: '52% parcial', pct: 0.52, validado: true, lista: 'enviada' },
  { label: 'comprobante pendiente revisión', pendiente: true, lista: 'notificada', montoFull: true },
  { label: '1ra cuota + 2da pendiente', pct: 0.38, validado: true, lista: 'enviada', segundoPendiente: true },
  { label: 'sin pago, lista en edición', pct: 0, lista: 'en_edicion' },
  { label: 'sin pago, lista enviada', pct: 0, lista: 'enviada' },
]

function fifoBlock(idAc, monto, cidVar = 'cid') {
  return `
  PERFORM _sim_fifo(${idAc}, ${monto}, ${cidVar});`
}

async function main() {
  const { data: camp, error: e1 } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG).single()
  if (e1 || !camp) throw new Error(`Campeonato ${SLUG} no encontrado`)

  const { data: acs, error: e2 } = await sb
    .from('academia_campeonato')
    .select('id, monto_total, academia:academia(nombre)')
    .eq('id_campeonato', camp.id_campeonato)
    .order('id')
  if (e2 || !acs?.length) throw new Error('Sin academias en el campeonato')

  const idCamp = camp.id_campeonato
  const acIds = acs.map((a) => a.id)

  let sql = `-- Realismo campeonato ${SLUG} (id=${idCamp})
-- Generado: ${new Date().toISOString()}

DELETE FROM asignacion_pago
WHERE id_linea IN (SELECT id_linea FROM linea_inscripcion WHERE id_campeonato = ${idCamp});

DELETE FROM comprobante_pago
WHERE id_academia_campeonato IN (${acIds.join(',')});

UPDATE linea_inscripcion SET
  estado = CASE WHEN modalidad = 'oficial' OR precio_aplicado = 0 THEN 'pagado' ELSE 'pendiente_pago' END,
  dorsal_prefijo = NULL, dorsal_numero = NULL, dorsal_display = NULL,
  updated_at = now()
WHERE id_campeonato = ${idCamp};

UPDATE academia_campeonato SET
  monto_asignado = 0, estado_pago = 'pendiente', ultimo_cambio_at = now()
WHERE id_campeonato = ${idCamp};

CREATE OR REPLACE FUNCTION _sim_fifo(p_ac int, p_monto numeric, p_comp int) RETURNS void AS $$
BEGIN
  WITH ordered AS (
    SELECT id_linea, precio_aplicado::numeric AS precio,
      SUM(precio_aplicado) OVER (ORDER BY created_at, id_linea) AS run_sum
    FROM linea_inscripcion
    WHERE id_academia_campeonato = p_ac AND estado = 'pendiente_pago' AND precio_aplicado > 0
  ),
  paid AS (SELECT id_linea, precio FROM ordered WHERE run_sum <= p_monto)
  UPDATE linea_inscripcion l SET estado = 'pagado', updated_at = now()
  FROM paid p WHERE l.id_linea = p.id_linea;

  INSERT INTO asignacion_pago (id_comprobante, id_linea, monto)
  SELECT p_comp, o.id_linea, o.precio FROM (
    SELECT id_linea, precio_aplicado::numeric AS precio,
      SUM(precio_aplicado) OVER (ORDER BY created_at, id_linea) AS run_sum
    FROM linea_inscripcion
    WHERE id_academia_campeonato = p_ac AND precio_aplicado > 0
  ) o WHERE o.run_sum <= p_monto
  ON CONFLICT (id_comprobante, id_linea) DO UPDATE SET monto = EXCLUDED.monto;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE cid int;
BEGIN
`

  const dorsalIds = []

  for (let i = 0; i < acs.length; i++) {
    const ac = acs[i]
    const sc = ESCENARIOS[i] || ESCENARIOS[ESCENARIOS.length - 1]
    const total = Number(ac.monto_total)
    const monto = sc.montoFull ? total : Math.round(total * sc.pct)
    const nombre = ac.academia?.nombre || `ac-${ac.id}`

    sql += `\n  -- [${i + 1}] ${nombre}: ${sc.label}\n`

    if (sc.pendiente && !sc.segundoPendiente) {
      sql += `  INSERT INTO comprobante_pago (id_academia_campeonato, monto_declarado, numero_operacion, archivo_url, estado, observaciones, created_at)
  VALUES (${ac.id}, ${total}, 'BCP-SIM-${ac.id}-REV', 'simulacion/vouchers/${ac.id}-REV.jpg', 'pendiente', 'Comprobante en revisión tesorería', now() - interval '2 days');\n`
      sql += `  UPDATE academia_campeonato SET estado_lista='${sc.lista}' WHERE id=${ac.id};\n`
      continue
    }

    if (sc.segundoPendiente) {
      const m1 = Math.round(total * sc.pct)
      sql += `  INSERT INTO comprobante_pago (id_academia_campeonato, monto_declarado, monto_validado, numero_operacion, archivo_url, estado, observaciones, created_at)
  VALUES (${ac.id}, ${m1}, ${m1}, 'BCP-SIM-${ac.id}-C1', 'simulacion/vouchers/${ac.id}-C1.jpg', 'validado', 'Primera cuota', now() - interval '9 days')
  RETURNING id_comprobante INTO cid;${fifoBlock(ac.id, m1)}
  INSERT INTO comprobante_pago (id_academia_campeonato, monto_declarado, numero_operacion, archivo_url, estado, observaciones, created_at)
  VALUES (${ac.id}, ${total - m1}, 'BCP-SIM-${ac.id}-C2', 'simulacion/vouchers/${ac.id}-C2.jpg', 'pendiente', 'Segunda cuota en revisión', now() - interval '1 day');\n`
      sql += `  UPDATE academia_campeonato SET estado_lista='${sc.lista}' WHERE id=${ac.id};\n`
      continue
    }

    if (sc.pct === 0) {
      sql += `  UPDATE academia_campeonato SET estado_lista='${sc.lista}' WHERE id=${ac.id};\n`
      continue
    }

    const suffix = sc.pct === 1 ? 'FULL' : `P${Math.round(sc.pct * 100)}`
    sql += `  INSERT INTO comprobante_pago (id_academia_campeonato, monto_declarado, monto_validado, numero_operacion, archivo_url, estado, observaciones, created_at)
  VALUES (${ac.id}, ${monto}, ${monto}, 'BCP-SIM-${ac.id}-${suffix}', 'simulacion/vouchers/${ac.id}-${suffix}.jpg', 'validado', '${sc.label}', now() - interval '${7 - i} days')
  RETURNING id_comprobante INTO cid;${fifoBlock(ac.id, monto)}
  UPDATE academia_campeonato SET estado_lista='${sc.lista}' WHERE id=${ac.id};\n`
    if (sc.dorsal) dorsalIds.push(ac.id)
  }

  sql += `END $$;

UPDATE academia_campeonato ac SET
  monto_total = COALESCE((SELECT SUM(precio_aplicado) FROM linea_inscripcion l WHERE l.id_academia_campeonato = ac.id AND l.estado != 'anulado'), 0),
  monto_asignado = COALESCE((SELECT SUM(ap.monto) FROM asignacion_pago ap JOIN linea_inscripcion l ON l.id_linea = ap.id_linea WHERE l.id_academia_campeonato = ac.id), 0),
  ultimo_cambio_at = now()
WHERE ac.id_campeonato = ${idCamp};

UPDATE academia_campeonato SET
  estado_pago = CASE
    WHEN monto_asignado = 0 THEN 'pendiente'
    WHEN monto_asignado < monto_total THEN 'parcial'
    ELSE 'validado'
  END
WHERE id_campeonato = ${idCamp};
`

  if (dorsalIds.length) {
    sql += `
DO $$
DECLARE r record; num int := 0;
BEGIN
  FOR r IN
    SELECT l.id_linea, a.codigo_prefijo
    FROM linea_inscripcion l
    JOIN academia_campeonato ac ON ac.id = l.id_academia_campeonato
    JOIN academia a ON a.id_academia = ac.id_academia
    WHERE l.id_campeonato = ${idCamp} AND ac.id IN (${dorsalIds.join(',')}) AND l.estado = 'pagado'
    ORDER BY l.id_linea
  LOOP
    num := num + 1;
    UPDATE linea_inscripcion SET
      estado = 'aprobado',
      dorsal_prefijo = r.codigo_prefijo,
      dorsal_numero = num,
      dorsal_display = r.codigo_prefijo || '-' || LPAD(num::text, 2, '0'),
      updated_at = now()
    WHERE id_linea = r.id_linea;
  END LOOP;
END $$;
`
  }

  sql += `\nDROP FUNCTION IF EXISTS _sim_fifo(int, numeric, int);\n`

  const dir = join(root, 'scripts/.simulacion')
  mkdirSync(dir, { recursive: true })
  const out = join(dir, 'realismo.sql')
  writeFileSync(out, sql)

  console.log('✅ SQL generado:', out)
  console.log('   Ejecutar en Supabase SQL Editor o MCP execute_sql')
  console.log(`   Campeonato: ${SLUG} (id=${idCamp}), ${acs.length} academias`)
}

main().catch((e) => { console.error(e); process.exit(1) })
