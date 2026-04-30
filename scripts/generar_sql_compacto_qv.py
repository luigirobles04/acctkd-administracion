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
            f"{esc(tel) if tel else 'NULL'}, {esc(fin)}::date, {esc(code)}, NULL, {prn}, {trn})"
        )
        rows_data.append({"nombres": nom, "apellidos": ape, "codigo": code, "idx": n_inserted})

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
  'activo',
  true,
  v.fing,
  v.codigo,
  NULL,
  v.obs
FROM (
  VALUES
{val_block}
) AS v(dni, nombres, apellidos, fna, sexo, telefono, fing, codigo, obs, prn, trn)
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
