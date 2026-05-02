#!/usr/bin/env python3
"""Genera supabase/migrations/..._baseline_schema.sql desde list_tables verbose (JSON)."""
import json
import re
import sys
from collections import defaultdict

def table_name(full: str) -> str:
    return full.replace("public.", "")

def pg_type(col: dict) -> str:
    fmt = col.get("format") or ""
    if fmt == "int4":
        return "INTEGER"
    if fmt == "varchar":
        return "VARCHAR"
    if fmt == "text":
        return "TEXT"
    if fmt == "bool":
        return "BOOLEAN"
    if fmt == "numeric":
        return "NUMERIC"
    if fmt == "date":
        return "DATE"
    if fmt == "time":
        return "TIME"
    if fmt == "timestamptz":
        return "TIMESTAMPTZ"
    if fmt == "bpchar":
        return "CHAR(1)"
    if fmt == "_int4":
        return "INTEGER[]"
    return "TEXT"

def seq_from_default(dv: str):
    if not dv or "nextval" not in dv:
        return None
    m = re.search(r"nextval\('([^']+)'", dv)
    return m.group(1) if m else None

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "scripts/schema_snapshot_list_tables.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    tables = data["tables"]
    by_name = {table_name(t["name"]): t for t in tables}
    names = list(by_name.keys())

    deps = {tn: set() for tn in names}
    for t in tables:
        tn = table_name(t["name"])
        for fk in t.get("foreign_key_constraints", []):
            tgt_tbl = table_name(fk["target"].rsplit(".", 1)[0])
            if tgt_tbl == tn:
                continue
            if tgt_tbl in by_name:
                deps[tn].add(tgt_tbl)

    in_degree = {n: len(deps[n]) for n in names}
    queue = sorted([n for n in names if in_degree[n] == 0])
    order = []
    while queue:
        n = queue.pop(0)
        order.append(n)
        for m in names:
            if n in deps[m]:
                in_degree[m] -= 1
                if in_degree[m] == 0:
                    queue.append(m)
                    queue.sort()
    for n in names:
        if n not in order:
            order.append(n)

    out = []
    out.append("-- ACCTKD · baseline schema (snapshot proyecto Supabase vía MCP list_tables verbose)")
    out.append("-- Fresh DB only. Migraciones posteriores usan IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.")
    out.append("BEGIN;")

    sequences = set()
    for tn in order:
        for col in by_name[tn]["columns"]:
            if "generated" in (col.get("options") or []):
                continue
            dv = col.get("default_value") or ""
            sq = seq_from_default(dv)
            if sq:
                sequences.add(sq)
    for sq in sorted(sequences):
        out.append(f"CREATE SEQUENCE IF NOT EXISTS {sq};")

    for tn in order:
        t = by_name[tn]
        col_lines = []
        for col in t["columns"]:
            opts = col.get("options") or []
            if "generated" in opts:
                expr = (col.get("default_value") or "").strip()
                if expr.startswith("(") and expr.endswith(")"):
                    expr = expr[1:-1]
                col_lines.append(
                    f'  "{col["name"]}" NUMERIC GENERATED ALWAYS AS ({expr}) STORED'
                )
                continue
            parts = [f'  "{col["name"]}" {pg_type(col)}']
            if "updatable" in opts and "nullable" not in opts:
                parts.append("NOT NULL")
            dv = col.get("default_value")
            if dv:
                parts.append(f"DEFAULT {dv}")
            chk = col.get("check")
            if chk:
                parts.append(f"CHECK ({chk})")
            col_lines.append(" ".join(parts))
        pk = t.get("primary_keys") or []
        if pk:
            pk_sql = ", ".join(f'"{c}"' for c in pk)
            col_lines.append(f"  PRIMARY KEY ({pk_sql})")
        body = ",\n".join(col_lines)
        out.append(f'CREATE TABLE IF NOT EXISTS "{tn}" (\n{body}\n);')

    seen_uniq = set()
    for tn in order:
        t = by_name[tn]
        for col in t["columns"]:
            opts = col.get("options") or []
            if "unique" not in opts:
                continue
            cn = col["name"]
            if cn in (t.get("primary_keys") or []):
                continue
            key = (tn, cn)
            if key in seen_uniq:
                continue
            seen_uniq.add(key)
            cname = f"{tn}_{cn}_key"
            out.append(
                f'DO $$ BEGIN '
                f'ALTER TABLE "{tn}" ADD CONSTRAINT "{cname}" UNIQUE ("{cn}"); '
                f'EXCEPTION WHEN duplicate_object THEN NULL; END $$;'
            )

    for tn in order:
        t = by_name[tn]
        for fk in t.get("foreign_key_constraints", []):
            fn = fk["name"]
            src_col = fk["source"].rsplit(".", 1)[1]
            tgt_tbl = table_name(fk["target"].rsplit(".", 1)[0])
            tgt_col = fk["target"].rsplit(".", 1)[1]
            out.append(f'ALTER TABLE "{tn}" DROP CONSTRAINT IF EXISTS "{fn}";')
            out.append(
                f'ALTER TABLE "{tn}" ADD CONSTRAINT "{fn}" '
                f'FOREIGN KEY ("{src_col}") REFERENCES "{tgt_tbl}"("{tgt_col}");'
            )

    for tn in order:
        out.append(f'ALTER TABLE "{tn}" ENABLE ROW LEVEL SECURITY;')

    out.append("COMMIT;")

    dest = "supabase/migrations/20260115000000_baseline_schema_from_remote.sql"
    with open(dest, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("Wrote", dest, "tables:", len(order), "sequences:", len(sequences))


if __name__ == "__main__":
    main()
