"""Genera supabase/seed/sistema_qv_alumnos_compact.sql (un solo INSERT+SELECT)."""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from enriquecimiento_demo_qv import bloque_enriquecimiento, limpieza_previa_pagos_y_apoderados

CSV_P = ROOT / "data" / "sistema_qv_ejemplo" / "alumno_rows.csv"
OUT = ROOT / "supabase" / "seed" / "sistema_qv_alumnos_compact.sql"
OUT_SOLO = ROOT / "supabase" / "seed" / "sistema_qv_demo_solo_enriquecer.sql"

# ~20 alumnos extra con estados variados (DNIs 80000xxx no usados en el CSV demo)
EXTRA_ALUMNOS: list[tuple[str, str, str, str, str, str, str, str]] = [
    ("80000101", "Valeria", "Soto Paredes", "2011-04-12", "F", "987111101", "2026-03-01", "prueba"),
    ("80000102", "Mateo", "Quispe Flores", "2012-01-20", "M", "987111102", "2026-02-14", "prueba"),
    ("80000103", "Camila", "Rojas Díaz", "2010-09-05", "F", "987111103", "2026-01-20", "activo"),
    ("80000104", "Bruno", "Castillo Núñez", "2013-11-30", "M", "987111104", "2026-04-01", "suspendido"),
    ("80000105", "Lucía", "Paredes Vera", "2011-02-28", "F", "987111105", "2025-12-10", "suspendido"),
    ("80000106", "Diego", "Mamani Torres", "2009-06-14", "M", "987111106", "2025-11-05", "retirado"),
    ("80000107", "Fernanda", "Huamán López", "2012-08-22", "F", "987111107", "2025-10-01", "retirado"),
    ("80000108", "Sebastián", "Condori Ramos", "2010-12-01", "M", "987111108", "2026-03-18", "prueba"),
    ("80000109", "Ariana", "Salazar Mendoza", "2011-07-19", "F", "987111109", "2026-02-01", "activo"),
    ("80000110", "Renato", "Vargas Peña", "2013-04-07", "M", "987111110", "2026-01-08", "activo"),
    ("80000111", "Milagros", "Chávez Ortiz", "2010-01-25", "F", "987111111", "2025-09-14", "suspendido"),
    ("80000112", "Joaquín", "Palacios Ruiz", "2012-10-10", "M", "987111112", "2026-04-05", "prueba"),
    ("80000113", "Daniela", "Fuentes Cabrera", "2011-05-17", "F", "987111113", "2025-08-20", "retirado"),
    ("80000114", "Iker", "Medina Salas", "2013-03-03", "M", "987111114", "2026-03-12", "activo"),
    ("80000115", "Paula", "Aguirre Silva", "2010-10-29", "F", "987111115", "2025-12-22", "prueba"),
    ("80000116", "Nicolás", "Reyes Campos", "2009-04-11", "M", "987111116", "2025-07-30", "retirado"),
    ("80000117", "Alison", "Basurto Gil", "2012-06-06", "F", "987111117", "2026-02-28", "suspendido"),
    ("80000118", "Martín", "Torres Luna", "2011-11-24", "M", "987111118", "2026-01-15", "activo"),
    ("80000119", "Regina", "Montesinos Paz", "2013-08-08", "F", "987111119", "2026-04-08", "prueba"),
    ("80000120", "Álvaro", "Peña del Águila", "2010-03-16", "M", "987111120", "2025-06-01", "retirado"),
]


def activo_sql(estado: str) -> str:
    return "true" if estado in ("activo", "prueba") else "false"


def esc(s) -> str:
    if s is None:
        return "NULL"
    s = str(s).strip()
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def esc_d(s) -> str:
    if s is None or not str(s).strip():
        return "NULL"
    return esc(str(s).strip())


def main() -> None:
    rows = list(csv.DictReader(CSV_P.open(encoding="utf-8")))
    value_rows: list = []
    rows_data: list[dict] = []
    for row in rows:
        dni = (row.get("dni_alumno") or "").strip() or None
        nom = (row.get("nombres") or "").strip()
        ape = (row.get("apellidos") or "").strip()
        if not nom or not ape:
            continue
        fna = (row.get("fecha_nacimiento") or "").strip() or None
        if fna and fna > "2026":
            fna = "2014-11-20"
        sexo = (row.get("sexo") or "M")[:1].upper()
        if sexo not in ("M", "F"):
            sexo = "M"
        tel = (row.get("telefono") or "").strip() or None
        fin = (row.get("fecha_ingreso_qv") or "2026-01-15").strip()
        n_inserted = len(value_rows) + 1
        prn = 1 + ((n_inserted - 1) % 3)
        trn = 1 + ((n_inserted - 1) % 9)
        code = f"CCTKD-{n_inserted:04d}"
        value_rows.append(
            f"  ({esc_d(dni)}, {esc(nom)}, {esc(ape)}, {esc(fna) if fna else 'NULL'}, {esc(sexo)}, "
            f"{esc(tel) if tel else 'NULL'}, {esc(fin)}::date, {esc(code)}, NULL, {prn}, {trn}, "
            f"{esc('activo')}, {activo_sql('activo')})"
        )
        rows_data.append({"nombres": nom, "apellidos": ape, "codigo": code, "idx": n_inserted})

    for dni_e, nom_e, ape_e, fna_e, sexo_e, tel_e, fing_e, estado_e in EXTRA_ALUMNOS:
        n_inserted = len(value_rows) + 1
        prn = 1 + ((n_inserted - 1) % 3)
        trn = 1 + ((n_inserted - 1) % 9)
        code = f"CCTKD-{n_inserted:04d}"
        value_rows.append(
            f"  ({esc_d(dni_e)}, {esc(nom_e)}, {esc(ape_e)}, {esc(fna_e)}, {esc(sexo_e)}, "
            f"{esc(tel_e)}, {esc(fing_e)}::date, {esc(code)}, NULL, {prn}, {trn}, "
            f"{esc(estado_e)}, {activo_sql(estado_e)})"
        )
        rows_data.append({"nombres": nom_e, "apellidos": ape_e, "codigo": code, "idx": n_inserted})

    val_block = ",\n".join(value_rows)
    sel = f"""
INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
)
SELECT
  s.id_sede,
  v.dni::VARCHAR(15),
  v.nombres, v.apellidos, v.fna::DATE, v.sexo, v.telefono,
  p.id_plan,
  t.id_turno,
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  v.estado_alu,
  v.activo_alu,
  v.fing,
  v.codigo,
  NULL,
  v.obs
FROM (
  VALUES
{val_block}
) AS v(dni, nombres, apellidos, fna, sexo, telefono, fing, codigo, obs, prn, trn, estado_alu, activo_alu)
CROSS JOIN (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1) s
JOIN (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) p ON p.rn = v.prn
JOIN (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t ON t.rn = v.trn;
"""
    n = len(value_rows)
    codigos = [r["codigo"] for r in rows_data]
    lim = limpieza_previa_pagos_y_apoderados(codigos, n)
    enr = bloque_enriquecimiento(rows_data)
    codes_in = ",\n  ".join(esc(c) for c in codigos)
    out = (
        "-- ACCTKD · carga compacta de prueba (CCTKD-0001+) — generada por scripts/generar_sql_compacto_qv.py\n"
        "-- Datos ficticios para revisión del sistema.\n"
        "BEGIN;\n"
        f"{lim}\n"
        f"DELETE FROM alumno WHERE codigo_alumno IN (\n  {codes_in}\n);\n"
        f"{sel}\n"
        f"{enr}\n"
        "COMMIT;\n"
    )
    OUT.write_text(out, encoding="utf-8")
    solo = (
        "-- Enriquece alumnos ya cargados con códigos CCTKD-0001 … (misma lista que el CSV del generador).\n"
        "BEGIN;\n"
        f"{lim}\n"
        f"{enr}\n"
        "COMMIT;\n"
    )
    OUT_SOLO.write_text(solo, encoding="utf-8")
    print("OK", len(out), "bytes,", len(value_rows), "alumnos ->", OUT.name, "y", OUT_SOLO.name)


if __name__ == "__main__":
    main()
