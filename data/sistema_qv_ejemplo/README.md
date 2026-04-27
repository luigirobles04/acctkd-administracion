# Import ejemplo · sistema QV → ACCTKD

## Qué trae el export (QV)

- **44–45 alumnos** (CSV/SQL) con: `dni`, nombres, apellidos, nacimiento, sexo, teléfono, fecha de ingreso, `foto` (URL en otro Supabase), UUID de `id_apoderado` y `id_usuario`.
- Estructura alineada a **PostgreSQL/Supabase**; los IDs de alumno y apoderado son **UUID** en QV. En **ACCTKD** los alumnos usan `id_alumno` **integer** (serial) y apoderado **integer**; no se reutilizan los UUIDs del export.

## Ajustes hechos para esta demo

| Origen (QV) | ACCTKD |
|-------------|--------|
| `dni_alumno` | `dni` (NULL si venía vacío) |
| `fecha_ingreso_qv` | `fecha_ingreso` |
| `nombres` / `apellidos` | espacios y comillas corregidos |
| Foto a otro proyecto | no importada; sube foto en ACCTKD si la necesitas |
| `id_apoderado` UUID | `NULL` en el seed (vincular después en ficha) |
| `id_usuario` / `auth_uid` | no usado en el INSERT (auth custom por aparte) |
| Código de alumno | generado: `CCTKD-DEMO-0001` … |
| Un registro con fecha nac. futura errónea | corregida en el CSV a una fecha razonable |

## Cómo cargar en Supabase

1. Tener aplicadas las migraciones y el seed `20260420_000002_seed_data.sql` (sede, planes, turnos, grados).
2. En **SQL Editor**, pega y ejecuta `../../supabase/seed/sistema_qv_alumnos_demo.sql`.
3. Si choca con alumnos previos, borra los demo (`DELETE ... WHERE codigo_alumno LIKE 'CCTKD-DEMO-%'`) o cambia el prefijo en `scripts/generar_seed_alumnos_sistema_qv.py` y vuelve a generar.

## Regenerar el SQL

```bash
python3 scripts/generar_seed_alumnos_sistema_qv.py > supabase/seed/sistema_qv_alumnos_demo.sql
```
