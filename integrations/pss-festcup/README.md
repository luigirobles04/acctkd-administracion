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
| GET | `/api/pss/campeonato/{id}/poomsae` | Snapshot participantes poomsae (cola offline) |
| PATCH | `/api/pss/campeonato/{id}/poomsae/{idLinea}/puntaje` | `{ puntaje }` 0–10 por línea |

**Admin web / árbitro:** rutas `/api/admin/*` requieren sesión (`Authorization: Bearer` del login). Middleware valida rol (`admin`, `admin_campeonato`, `organizador`, `arbitro_mesa` según ruta).

**Token:** variable de entorno `PSS_API_SECRET` en Vercel, o `campeonato.pss_token` en BD. En Unity Setup pegar el mismo secreto (no commitear).

**FestCup 2026:** `id_campeonato = 10`, slug `festcup-2026`.

## Mapeo colores

| Unity | ERP | Campo |
|-------|-----|-------|
| CHONG (azul) | `id_linea1` / `puntaje1` | Azul |
| HONG (rojo) | `id_linea2` / `puntaje2` | Rojo |

## Logos de academia

- El snapshot (kyorugi y poomsae) incluye `academia_logo` (ruta de storage).
- Al **descargar la cola**, Unity baja los logos vía `/api/fotos/competidor?path=…` y los cachea en `acctkd_logos/` (offline).
- El marcador muestra el logo de la academia en lugar de la bandera; si falta, cae a bandera / inicial.

## Modo proyector (poomsae)

- Botón **PROYECTOR** en el panel operador (o tecla **V**): oculta el panel, agranda puntajes de jueces (54px), total del reveal (140px) y nombre del atleta.
- Pensado para compartir la pantalla al proyector; el operador sigue controlando con teclado (Enter crono, Espacio cerrar técnica, P presentación, R mostrar, V volver).

## Zona de llamados (web, 4.ª PC)

- Página pública: `/campeonato/{slug}/llamados` — las **3 áreas en una sola pantalla** (combate actual con `cancha/orden` ej. `3/07`, marcador live, siguientes y último resultado).
- Un solo poll cada 6 s por pantalla (endpoint agregado `/api/campeonato/{slug}/llamados`), ideal para pantalla grande sin sobrecargar el servidor.
- Enlace destacado en `/campeonato/{slug}/canchas`.

## Modo offline

1. Con internet: **COLA ACCTKD** → descarga snapshot del área (+ logos).
2. Sin internet: marcación local + avance de llave en la laptop.
3. Operaciones pendientes en `sync_queue.json`; al reconectar se suben solas (reintento con backoff, indicador "SYNC PENDIENTE: N" visible en el marcador).

## Flujo en pista

```
Menú → COMBATE → COLA ACCTKD → Descargar → Mandos → Opciones (auto) → Checklist → Marcador
```

Al terminar combate: avance local → siguiente combate de la cola → sync en background.

**Walkover (rival no vino):** en COLA ACCTKD → **W/O AZUL** o **W/O ROJO** tras cargar el combate. También disponible en `/arbitro` web.
