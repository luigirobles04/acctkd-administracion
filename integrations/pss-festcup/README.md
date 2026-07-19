# PSS FESTCUP — Integración ACCTKD

Copia de **PSS TKD ACCTKD** con puente offline-first hacia el ERP.

## Ubicación

- **Unity:** `/Users/luigiarmandoroblespalacios/Desktop/PSS FESTCUP`
- **Original intacto:** `/Users/luigiarmandoroblespalacios/Desktop/PSS TKD ACCTKD`

## APIs ERP (PSS)

Todas requieren header `X-PSS-Token` (o `Authorization: Bearer`).

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/pss/campeonato/{id}/area/{1-3}` | Descargar snapshot (cola + llaves) |
| PATCH | `/api/pss/campeonato/{id}/combate/{idLlave}/iniciar` | Marcar combate en curso |
| PATCH | `/api/pss/campeonato/{id}/combate/{idLlave}/marcador` | `{ puntaje1, puntaje2 }` en vivo |
| PATCH | `/api/pss/campeonato/{id}/combate/{idLlave}/finalizar` | `{ ganadorIdLinea, puntaje1?, puntaje2?, walkover?: true }` |

**Token:** variable de entorno `PSS_API_SECRET` en Vercel, o `campeonato.pss_token` en BD.

**Producción:** https://festcup2026.com

## Mapeo colores

| Unity | ERP | Campo |
|-------|-----|-------|
| CHONG (azul) | `id_linea1` / `puntaje1` | Azul |
| HONG (rojo) | `id_linea2` / `puntaje2` | Rojo |

## Modo offline

1. Con internet: **COLA ACCTKD** → descarga snapshot del área.
2. Sin internet: marcación local + avance de llave en la laptop.
3. Operaciones pendientes en `sync_queue.json`; al reconectar se suben solas.

## Flujo en pista

```
Menú → COMBATE → COLA ACCTKD → Descargar → Mandos → Opciones (auto) → Checklist → Marcador
```

Al terminar combate: avance local → siguiente combate de la cola → sync en background.

**Walkover (rival no vino):** en COLA ACCTKD → **W/O AZUL** o **W/O ROJO** tras cargar el combate. También disponible en `/arbitro` web.
