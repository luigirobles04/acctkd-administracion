# Checklist FestCup — Día del evento

**Campeonato oficial:** Taekwondo FestCup 2026 · slug `festcup-2026` · id `10`  
**Ensayo técnico:** slug `prueba-llaves-cnu-2026` · id `9` (despublicado; TV sigue funcionando por URL directa)

## Variables Vercel obligatorias (producción)

En **Vercel → Settings → Environment Variables** y redeploy:

- [ ] `SESSION_SECRET` — firma de sesión admin/portal/árbitro (largo, aleatorio). **Obligatorio: sin él el login y toda la API admin quedan bloqueados en producción (fail-closed).**
- [ ] `PSS_API_SECRET` — token de las laptops Unity (header `X-PSS-Token`)
- [ ] `CRON_SECRET` — backup nocturno (`/api/cron/backup-campeonato` es fail-closed sin él)
- [ ] `ACCTKD_OPS_KEY` — clave dedicada de operaciones (seed producción, llaves sin pesaje). **Los 4 secretos deben ser distintos entre sí.**
- [ ] Verificar auth: `curl -s -o /dev/null -w "%{http_code}" https://festcup2026.com/api/admin/campeonatos/10/detalle` → debe dar **401**

## Antes del campeonato (con internet)

- [ ] Cerrar inscripciones y completar pesaje
- [ ] Aprobar academias y asignar dorsales
- [ ] **Generar todas las llaves** (una sola vez)
- [ ] Categorías con **1 competidor** → botón **Oro único** en admin/llaves
- [ ] Imprimir **PDF Área 1, 2 y 3** (backup en papel para árbitros)
- [ ] Planilla **Festival Kyorugi**: admin → Planilla Festival → PDF/Excel (no usa llaves)

## 3 laptops Unity (kyorugi)

Por cada área (1, 2, 3):

- [ ] COMBATE → COLA ACCTKD → configurar URL, ID campeonato, área, token
- [ ] **DESCARGAR COLA** → verificar "Snapshot: X combates"
- [ ] Probar mandos (COMPROBAR CONEXIÓN)
- [ ] **No regenerar llaves** después de descargar snapshot

## Durante el evento (offline OK en Unity)

- [ ] CARGAR SIGUIENTE → mandos → combate
- [ ] **Rival no vino** → botón **W/O AZUL** o **W/O ROJO** (Unity o `/arbitro` web)
- [ ] **Exhibición** → admin llaves: dorsales + área (no afecta podio)
- [ ] En breaks: conectar WiFi → esperar sync (pendientes = 0)

## TV y resultados (necesitan internet)

- [ ] TV: `/campeonato/{slug}/cancha/1` (2, 3)
- [ ] **Zona de llamados (4.ª PC):** `/campeonato/festcup-2026/llamados` — 3 áreas en una pantalla, F11 fullscreen
- [ ] Resultados: `/campeonato/{slug}/resultados`
- [ ] Router 4G/WiFi del coliseo activo

## Logos de academia (Unity v1.1)

- [ ] Subir logos de academias en admin (aparecen en marcador Unity y llamados web)
- [ ] Al **DESCARGAR COLA** verificar mensaje "N logos de academia listos para offline"

## Poomsae

- [ ] Unity: POOMSAE → COLA ACCTKD → descargar → siguiente atleta
- [ ] **Modo proyector:** botón PROYECTOR o tecla **V** (puntajes gigantes, panel operador oculto)
  - Atajos: Enter crono · Espacio cerrar técnica · P cerrar presentación · R mostrar · V volver
- [ ] Plan B: `/arbitro` → Poomsae (celular/tablet con internet)

## Plan B si falla laptop

- [ ] PDF impreso + `/arbitro` web en celular
- [ ] Otra laptop descarga misma área (con internet)

## Simulación previa (domingo/lunes)

```bash
cd taekwondo-erp
npm test
npm run preparar:festcup    # crea/actualiza FestCup 2026 oficial
npm run ensayo:festcup        # ensayo completo (usa campeonato prueba id=9)
```

- [ ] 10+ combates Unity offline → reconectar → verificar web
- [ ] 1 walkover de prueba
- [ ] 1 exhibición de prueba
- [ ] 1 categoría oro único
