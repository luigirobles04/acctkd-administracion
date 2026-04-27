#!/usr/bin/env python3
"""
Convierte export CSV (sistema QV) en INSERT SQL para ACCTKD.
Uso: python3 scripts/generar_seed_alumnos_sistema_qv.py > supabase/seed/sistema_qv_alumnos_demo.sql
Requiere: data/sistema_qv_ejemplo/alumno_rows.csv
"""
import csv
import os
import sys
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), "..")
CSV_PATH = os.path.join(ROOT, "data", "sistema_qv_ejemplo", "alumno_rows.csv")


def sql_str(s) -> str:
    if s is None or s == "":
        return "NULL"
    s = str(s).strip().replace("'", "''")
    if not s:
        return "NULL"
    return f"'{s}'"


def sql_dni(s) -> str:
    if s is None or str(s).strip() == "":
        return "NULL"
    return sql_str(str(s).strip())


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        rows = list(r)

    today = date.today()
    out = []
    out.append("""-- ACCTKD · Carga demo desde export sistema QV (ejemplo)
-- Ejecutar en Supabase SQL Editor DESPUÉS de 20260420_000002_seed_data.sql
-- Asigna sede/plan/turno/grado por subconsulta; códigos CCTKD-DEMO-0001 en adelante.
-- id_apoderado: NULL (export QV trae UUIDs; en ACCTKD son int). Completar apoderados en la UI o migración aparte.
-- Revisa UNIQUE(dni) y codigo_alumno si ya tienes alumnos reales: borra demo o ajusta prefijo.
BEGIN;

""")

    n_inserted = 0
    for i, row in enumerate(rows, start=1):
        nombres = (row.get("nombres") or "").strip()
        apellidos = (row.get("apellidos") or "").strip()
        if not nombres or not apellidos:
            continue
        n_inserted += 1
        dni = row.get("dni_alumno") or ""
        dni = dni.strip() if dni else ""
        if dni and not dni.isdigit():
            dni = "".join(c for c in dni if c.isdigit()) or dni

        fna = (row.get("fecha_nacimiento") or "").strip()
        if fna:
            try:
                y, m, d = [int(x) for x in fna.split("-")[:3]]
                bd = date(y, m, d)
                if bd > today or y > (today.year - 2):
                    # nacimientos claramente erróneos
                    fna = f"{min(y, 2010):04d}-06-15"
            except (ValueError, TypeError):
                fna = ""

        fin = (row.get("fecha_ingreso_qv") or "2026-01-15").strip()
        sexo = (row.get("sexo") or "M")[:1].upper()
        if sexo not in ("M", "F"):
            sexo = "M"

        tel = (row.get("telefono") or "").strip() or None

        prn = 1 + ((n_inserted - 1) % 3)  # 3 planes en seed
        trn = 1 + ((n_inserted - 1) % 9)  # 9 turnos en seed
        code = f"CCTKD-DEMO-{n_inserted:04d}"

        out.append(
            f"""INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  {sql_dni(dni)},
  {sql_str(nombres)},
  {sql_str(apellidos)},
  {sql_str(fna) if fna else "NULL"},
  {sql_str(sexo)},
  {sql_str(tel) if tel else "NULL"},
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = {prn} LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = {trn} LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  {sql_str(fin)}::date,
  {sql_str(code)},
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

"""
        )

    out.append("COMMIT;\n")
    print("".join(out), end="")
    print(f"-- Total INSERT: {n_inserted}", file=sys.stderr)


if __name__ == "__main__":
    main()
