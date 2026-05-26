"""SQL de enriquecimiento para alumnos de prueba (códigos CCTKD-0001+, sin 'DEMO').
Apoderado con apellidos del alumno, teléfono compartido, correo tipo nombre.apellido@gmail.com,
pagos variados, historial de grados y asistencias feb–abr (hasta 15 abr)."""
from __future__ import annotations

import re
import unicodedata

NOM_AP = [
    "Rosa Marina", "Juan Carlos", "María Elena", "Carlos Alberto", "Ana Lucía", "Luis Enrique",
    "Patricia", "Jorge Martín", "Carmen Rosa", "Miguel Ángel", "Diana Pilar", "Roberto",
    "Gloria", "Fernando", "Lucía", "Eduardo", "Katherine", "Omar", "Yolanda", "Héctor",
    "Nancy", "César Augusto", "Teresa", "Ricardo", "Sandra", "Pablo César", "Mili",
    "José Antonio", "Alicia", "Víctor", "Cecilia", "Bruno", "Lourdes", "Andrés", "Fiorella",
    "Diego", "Mónica", "Santiago", "Liliana", "Walter", "Irma", "Franco", "Natalia", "Gustavo",
    "Mirtha", "Paola", "Rodrigo", "Estefanía", "Fabricio", "Jimena", "Hugo", "Vanessa",
    "Arturo", "Marisol", "Elías", "Rocío", "Fabián", "Karina", "Matías", "Claudia",
    "Rafael", "Noemí", "Tomás", "Brenda",
]
REL = ("Madre", "Padre", "Padre", "Tutor", "Tía", "Abuela", "Padre", "Madre", "Tutor", "Tía")

SANGRE = ("O+", "A+", "B+", "AB+", "O-")
ALERG = (
    "Ninguna declarada",
    "Ninguna declarada",
    "Rinitis leve estacional",
    "Ninguna declarada",
    "Evitar snacks con maní en actividades grupales",
    "Ninguna declarada",
    "Ninguna declarada",
    "Ninguna declarada",
    "—",
    "Ninguna declarada",
)
CONDM = (
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Asma leve — inhalador de rescate cuando hace frío",
    "Miopía — usa lentes en rutina escolar",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
    "Sin antecedentes relevantes",
)
SEGURO = ("SIS", "EsSalud", "Particular", "No declara", "Familiar")
EMERG_N = ("Tía", "Abuela", "Hermana mayor", "Tío", "Madrina", "Mamá", "Papá", "Prima", "Tío")

OBS_ALU = (
    None,
    "Control ocasional de inhalador en invierno.",
    None,
    "Calentamiento unos minutos extra si hace mucho frío.",
    None,
    None,
    "Última revisión pediátrica sin observaciones.",
    None,
    None,
    "Trae agua y snack saludable post-clase.",
    None,
)


def codigos_seed(n: int) -> list[str]:
    return [f"CCTKD-{i:04d}" for i in range(1, n + 1)]


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").strip())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    return re.sub(r"[^a-z0-9]+", "", s)


def mail_apoderado(nombres_alu: str, apellidos_alu: str, idx: int) -> str:
    parts_n = (nombres_alu or "").split()
    parts_a = (apellidos_alu or "").split()
    fn = slug(parts_n[0] if parts_n else "contacto")
    a1 = slug(parts_a[0] if parts_a else "familia")
    suf = chr(ord("a") + (idx % 5)) if idx % 4 != 0 else ""
    return f"{fn}.{a1}{suf}@gmail.com"


def dni_apoderado_sintetico(n: int) -> str:
    return f"{(38_200_000 + n * 199 + 2_041) % 100_000_000:08d}"


def tlf_sintetico(n: int) -> str:
    base = 91_200_000 + (n * 183_217 + 40_000) % 7_000_000
    return f"9{str(base)[:8]}"


def tlf_emergencia(n: int) -> str:
    base = 94_500_000 + (n * 97_333 + 12_000) % 3_200_000
    return f"9{str(base)[:8]}"


def esc(s: str | None) -> str:
    if s is None:
        return "NULL"
    s = str(s).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def esc_obs(s: str | None) -> str:
    if s is None or not str(s).strip():
        return "NULL"
    return esc(str(s).strip())


def dnis_apoderado_lista(n_alumnos: int) -> str:
    return ",\n  ".join(esc(dni_apoderado_sintetico(i)) for i in range(1, n_alumnos + 1))


def lista_codigos_sql(codigos: list[str]) -> str:
    return ",\n  ".join(esc(c) for c in codigos)


def limpieza_previa_pagos_y_apoderados(codigos: list[str], n_alumnos: int) -> str:
    dnis = dnis_apoderado_lista(n_alumnos)
    cin = lista_codigos_sql(codigos)
    return f"""
-- Quitar códigos legacy CCTKD-DEMO-* (migración a CCTKD-0001+)
DELETE FROM asistencia_alumno WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno LIKE 'CCTKD-DEMO-%');
DELETE FROM historial_grados WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno LIKE 'CCTKD-DEMO-%');
DELETE FROM pago WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno LIKE 'CCTKD-DEMO-%');
UPDATE alumno SET id_apoderado = NULL WHERE codigo_alumno LIKE 'CCTKD-DEMO-%';
DELETE FROM alumno WHERE codigo_alumno LIKE 'CCTKD-DEMO-%';

-- Quitar dependencias de alumnos de prueba (re-ejecución)
DELETE FROM asistencia_alumno WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno IN (
  {cin}
));
DELETE FROM historial_grados WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno IN (
  {cin}
));
DELETE FROM pago WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE codigo_alumno IN (
  {cin}
));
UPDATE alumno SET id_apoderado = NULL WHERE codigo_alumno IN (
  {cin}
);
DELETE FROM apoderado WHERE dni IN (
  {dnis}
);
""".lstrip()


def bloque_enriquecimiento(rows_data: list[dict]) -> str:
    """rows_data: nombres, apellidos, codigo, idx (1..n)."""
    rows_apo: list = []
    rows_map: list = []
    rows_med: list = []
    pago_rows: list = []

    for row in rows_data:
        n = row["idx"]
        code = row["codigo"]
        nom_a = row["nombres"]
        ape_a = row["apellidos"]
        dni = dni_apoderado_sintetico(n)
        nom_ap = NOM_AP[(n - 1) % len(NOM_AP)]
        apo_ape = ape_a.strip()
        rel = REL[(n - 1) % len(REL)]
        tlf = tlf_sintetico(n)
        correo = mail_apoderado(nom_a, ape_a, n)
        rows_apo.append(f"  ({esc(nom_ap)}, {esc(apo_ape)}, {esc(dni)}, {esc(tlf)}, {esc(rel)}, {esc(correo)})")
        rows_map.append(f"  ({esc(code)}, {esc(dni)})")

        ts = SANGRE[(n + 2) % len(SANGRE)]
        al = ALERG[n % len(ALERG)]
        co = CONDM[n % len(CONDM)]
        sg = SEGURO[n % len(SEGURO)]
        if n % 6 == 0:
            en = f"{NOM_AP[n % len(NOM_AP)]} (apoyo)"
        else:
            en = f"{EMERG_N[n % len(EMERG_N)]} {ape_a.split()[0] if ape_a.split() else 'Familia'}"
        et = tlf_emergencia(n)
        oa = OBS_ALU[n % len(OBS_ALU)]
        rows_med.append(
            f"  ({esc(code)}, {esc(dni)}, {esc(ts)}, {esc(al)}, {esc(co)}, {esc(sg)}, {esc(en)}, {esc(et)}, {esc_obs(oa)})"
        )

        suf = code[-4:]
        pm = n % 5
        templates = [
            (f"M-{suf}-0126", "2026-01-08", "2026-01-01", "pagado", "efectivo", 0, "Mensualidad enero", "MENSUALIDAD", "Mensualidad", None),
            (f"M-{suf}-0226", "2026-02-07", "2026-02-01", "pagado", "yape", 0, "Mensualidad febrero", "MENSUALIDAD", "Mensualidad", None),
            (
                f"M-{suf}-0326",
                "2026-03-06",
                "2026-03-01",
                "pagado" if pm != 2 else "pendiente",
                "efectivo" if pm != 1 else "transferencia",
                0,
                "Mensualidad marzo",
                "MENSUALIDAD",
                "Mensualidad",
                None,
            ),
            (
                f"M-{suf}-0426",
                "2026-04-02",
                "2026-04-01",
                "pendiente" if pm in (2, 4) else ("vencido" if pm == 3 else "pagado"),
                "efectivo",
                0,
                "Mensualidad abril",
                "MENSUALIDAD",
                "Mensualidad",
                None,
            ),
        ]
        if pm == 0:
            templates.append(
                (f"E-{suf}-1125", "2025-11-18", "2025-11-01", "pagado", "yape", 0, "Examen KUP simulado", "EXAMEN_KUP", "Examen de grado (KUP)", 55)
            )
        for rec, fp, mc, est, met, desc, obs, conc, ctext, monto_fijo in templates:
            mf = "NULL" if monto_fijo is None else str(float(monto_fijo))
            pago_rows.append(
                f"  ({esc(code)}, {esc(fp)}::date, {esc(mc)}::date, {esc(est)}, {esc(met)}, {float(desc)}, {esc(obs)}, {esc(rec)}, {esc(conc)}, {esc(ctext)}, {mf})"
            )

    v_apo = ",\n".join(rows_apo)
    v_map = ",\n".join(rows_map)
    v_med = ",\n".join(rows_med)
    v_pago = ",\n".join(pago_rows)

    return f"""
-- Apoderados (apellidos del alumno; mismo teléfono que se asignará al alumno)
INSERT INTO apoderado (nombres, apellidos, dni, telefono, relacion, correo)
VALUES
{v_apo}
;

UPDATE alumno a
SET id_apoderado = apo.id_apoderado
FROM apoderado apo
INNER JOIN (
  VALUES
{v_map}
) AS m(codigo, dni_apo) ON apo.dni = m.dni_apo
WHERE a.codigo_alumno = m.codigo;

-- Ficha médica: alumno comparte celular del apoderado; observaciones leves o NULL
UPDATE alumno a
SET
  telefono = apo.telefono,
  tipo_sangre = v.tipo_sangre,
  alergias = v.alergias,
  condicion_medica = v.condicion_medica,
  seguro_medico = v.seguro_medico,
  contacto_emergencia_nombre = v.contacto_emergencia_nombre,
  contacto_emergencia_telefono = v.contacto_emergencia_telefono,
  observaciones = v.obs_alu
FROM (
  VALUES
{v_med}
) AS v(
  codigo, dni_apo, tipo_sangre, alergias, condicion_medica, seguro_medico,
  contacto_emergencia_nombre, contacto_emergencia_telefono, obs_alu
)
JOIN apoderado apo ON apo.dni = v.dni_apo
WHERE a.codigo_alumno = v.codigo AND a.id_apoderado = apo.id_apoderado;

-- Mensualidades y algunos conceptos extra (pagado / pendiente / vencido)
INSERT INTO pago (
  id_alumno, id_sede, id_concepto, id_metodo, id_plan,
  monto, descuento, estado, fecha_pago, mes_correspondiente,
  concepto, metodo_pago, observaciones, numero_recibo,
  fecha_vencimiento
)
SELECT
  a.id_alumno,
  a.id_sede,
  (SELECT id_concepto FROM concepto_pago WHERE codigo = v.conc LIMIT 1),
  (SELECT id_metodo FROM metodo_pago WHERE codigo = (
    CASE lower(trim(v.met))
      WHEN 'yape' THEN 'YAPE'
      WHEN 'transferencia' THEN 'BCP'
      WHEN 'plin' THEN 'PLIN'
      ELSE 'EFECTIVO'
    END
  ) LIMIT 1),
  a.id_plan,
  GREATEST(0::numeric, COALESCE(v.mfij, pm.monto) - COALESCE(v.descu, 0)),
  COALESCE(v.descu, 0),
  v.est,
  v.fp,
  v.mc,
  v.ctext,
  v.met,
  v.pobs,
  v.nrec,
  CASE
    WHEN v.est = 'pendiente' THEN v.fp + 12
    WHEN v.est = 'vencido' THEN v.fp - 5
    ELSE NULL
  END
FROM (
  VALUES
{v_pago}
) AS v(codigo, fp, mc, est, met, descu, pobs, nrec, conc, ctext, mfij)
JOIN alumno a ON a.codigo_alumno = v.codigo
JOIN plan_mensualidad pm ON pm.id_plan = a.id_plan
WHERE NOT EXISTS (SELECT 1 FROM pago p WHERE p.numero_recibo = v.nrec);

-- Historial de grados (1–2 exámenes ficticios por alumno)
INSERT INTO historial_grados (id_alumno, id_grado, fecha_examen, aprobado, observaciones, codigo_examen)
SELECT a.id_alumno, g1.id_grado, DATE '2024-06-10', true, 'Promoción examen mitad de año.', 'SIM-24-' || right(a.codigo_alumno, 4)
FROM alumno a
CROSS JOIN LATERAL (SELECT id_grado FROM grado_marcial ORDER BY nivel NULLS LAST, id_grado LIMIT 1 OFFSET 0) g1
WHERE a.codigo_alumno IN ({lista_codigos_sql([r["codigo"] for r in rows_data])});

INSERT INTO historial_grados (id_alumno, id_grado, fecha_examen, aprobado, observaciones, codigo_examen)
SELECT a.id_alumno, g2.id_grado, DATE '2025-09-05', true, 'Sube de grado — simulación.', 'SIM-25-' || right(a.codigo_alumno, 4)
FROM alumno a
CROSS JOIN LATERAL (
  SELECT id_grado FROM grado_marcial ORDER BY nivel NULLS LAST, id_grado LIMIT 1 OFFSET 1
) g2
WHERE a.codigo_alumno IN ({lista_codigos_sql([r["codigo"] for r in rows_data])})
AND (SELECT COUNT(*)::int FROM grado_marcial) >= 2;

-- Clases feb–15 abr 2026 según días del turno
INSERT INTO clase (id_turno, fecha)
SELECT t.id_turno, gs::date
FROM generate_series(DATE '2026-02-01', DATE '2026-04-15', INTERVAL '1 day') gs
JOIN turno t ON EXTRACT(ISODOW FROM gs::timestamp)::int = ANY(COALESCE(t.dias_array, ARRAY[]::int[]))
ON CONFLICT (id_turno, fecha) DO NOTHING;

-- Asistencias variadas (presente / ausente / justificada / recuperación)
INSERT INTO asistencia_alumno (id_clase, id_alumno, presente, justificado, observacion)
SELECT
  c.id_clase,
  a.id_alumno,
  CASE WHEN hm.h = ANY (ARRAY[0, 1, 2, 5]) THEN true ELSE false END,
  CASE WHEN hm.h = 4 THEN true ELSE false END,
  CASE WHEN hm.h = 5 THEN 'Recuperación' ELSE NULL END
FROM clase c
JOIN alumno a ON a.id_turno = c.id_turno AND a.estado IN ('activo', 'prueba')
CROSS JOIN LATERAL (
  SELECT mod(abs(hashtext(a.id_alumno::text || c.fecha::text)), 6)::int AS h
) hm
WHERE c.fecha BETWEEN DATE '2026-02-01' AND DATE '2026-04-15'
  AND a.codigo_alumno IN ({lista_codigos_sql([r["codigo"] for r in rows_data])})
ON CONFLICT (id_clase, id_alumno) DO UPDATE SET
  presente = EXCLUDED.presente,
  justificado = EXCLUDED.justificado,
  observacion = EXCLUDED.observacion;
""".lstrip()
