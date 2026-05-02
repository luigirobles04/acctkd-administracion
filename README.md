# ACCTKD · Administración

Sistema administrativo web para **Christopher Cabrera Tae Kwon Do** (Trujillo, Perú).
Gestiona alumnos, maestros, asistencias, pagos, exámenes de grado, comunicados y campeonatos abiertos (Kyorugi + Poomsae).

> Proyecto académico de práctica profesional · Universidad César Vallejo · 2026

---

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Estilos:** Tailwind CSS v4 + sistema de diseño iOS propio (`globals.css`)
- **BaaS:** Supabase (PostgreSQL + RLS + Storage)
- **PWA:** `public/manifest.json` (workbox vía dependencia en roadmap, por compatibilidad con Next 16)
- **Auth:** personalizado con `bcryptjs` (migración a Supabase Auth en roadmap)
- **Deploy:** Vercel (frontend) + Supabase (backend)
- **Zona horaria de trabajo:** Perú (UTC-5)

---

## Estructura

```
src/
├── app/
│   ├── admin/            → panel por módulos (alumnos, maestros, pagos, asistencia,
│   │                       campeonatos, usuarios, sedes, dashboard)
│   ├── login/            → autenticación
│   ├── globals.css       → sistema de diseño iOS
│   └── layout.js
├── components/
│   ├── layout/           → AdminLayout + Sidebar + TabBar móvil
│   ├── alumnos/          → AlumnoFormSheet
│   └── maestros/         → MaestroFormSheet
└── lib/
    ├── supabase.js       → cliente Supabase
    ├── services/         → capa de acceso a datos (alumno, maestro, auth)
    └── utils/format.js   → formato de fechas, dinero, teléfonos, iniciales
supabase/
└── migrations/           → migraciones versionadas del esquema + seed
```

---

## Puesta en marcha local

### Solo frontend (contra Supabase en la nube)

```bash
npm install
cp .env.example .env.local
# Edita .env.local: URL y anon key del proyecto Supabase (dashboard → Settings → API)
npm run dev
# http://localhost:3000
```

### Todo en tu máquina (Next + Supabase con Docker)

Así pruebas **la misma app y la misma base** antes de un solo despliegue conjunto.

1. **Docker Desktop** instalado y en ejecución.
2. **Supabase CLI**: [instrucciones](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase` o descarga binaria).
3. **Esquema base en migraciones**  
   El repo incluye `20260115000000_baseline_schema_from_remote.sql` (snapshot de tu proyecto real) más las migraciones `20260420_*` y RLS. Eso permite un `db reset` en local desde cero.

   Si cambias tablas en la nube y quieres **actualizar el baseline**, guarda el JSON de introspección en `scripts/schema_snapshot_list_tables.json` y ejecuta:

   ```bash
   python3 scripts/generar_baseline_desde_snapshot.py
   ```

   (Alternativa oficial: `supabase login`, `supabase link`, `supabase db pull`.)

   Si tu **proyecto Supabase cloud ya existía** antes de este baseline, no hace falta volver a ejecutar el SQL del baseline ahí: solo úsalo en entornos nuevos o en Docker local.

4. **Levantar stack local y aplicar migraciones**

   ```bash
   npm install
   npm run supabase:start    # o: supabase start
   npm run supabase:reset    # o: supabase db reset — aplica migraciones + seed.sql
   ```

5. **Variables para el frontend local**

   ```bash
   npm run supabase:status   # copia API URL y anon key
   ```

   En `.env.local` apunta a la API local, por ejemplo:

   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key que muestra el CLI>`

6. **Datos demo (alumnos, pagos, historial de grados)**  
   Tras el reset, en **Supabase Studio local** (http://127.0.0.1:54323 → SQL) puedes ejecutar `supabase/seed/sistema_qv_alumnos_compact.sql` si quieres la carga ficticia completa.

7. **Arrancar Next**

   ```bash
   npm run dev
   ```

**Studio local:** http://127.0.0.1:54323 · **API:** http://127.0.0.1:54321

> Si `db pull` no es opción, puedes volcar solo esquema desde el proyecto cloud (pg_dump / “Database backups”) y colocarlo como primera migración; el objetivo es que existan las tablas `sede`, `alumno`, `pago`, etc. antes de las migraciones `20260420_*`.

---

## Despliegue a Vercel

### Opción A · Panel web (recomendada)

1. Sube el repositorio a GitHub.
2. Entra a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Vercel detecta Next.js automáticamente. **No cambies** los comandos.
4. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_ACADEMIA_NOMBRE`
5. Click en **Deploy**. En ~2 min tendrás una URL `https://acctkd.vercel.app`.

### Opción B · CLI

```bash
npm i -g vercel
vercel login
vercel link       # enlaza el proyecto
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod     # despliega a producción
```

El archivo `vercel.json` ya trae configurados los headers de seguridad y la región `gru1` (São Paulo, la más cercana a Perú).

---

## Base de datos (Supabase)

El esquema completo está en `supabase/migrations/`.

Si inicializas una instancia nueva:

```bash
# Con el CLI de Supabase
npx supabase db push
```

O aplica cada `*.sql` desde **Supabase Studio → SQL Editor**.

### Seeds incluidos
- Roles (`admin`, `organizador`, `maestro`, `alumno`)
- 9 grados marciales base (blanco → negro)
- Métodos de pago (Efectivo, Yape, Plin, BCP, Interbank, Tarjeta)
- Conceptos de pago (Mensualidad, Matrícula, Examen KUP/DAN, Campeonato, Uniforme…)
- Planes de mensualidad (2/3/5 días)
- Turnos (L-M-V y Ma-J de 4 PM a 9 PM)
- Sede base: CCTKD Trujillo — El Recreo

---

## Módulos implementados

| Módulo | Estado |
|---|---|
| Login + sesión básica | ✅ |
| Dashboard administrativo | ✅ |
| **Alumnos** · CRUD + ficha completa + estados + filtros | ✅ |
| **Maestros** · CRUD + certificaciones + planilla mensual | ✅ |
| Sedes | 🟡 base |
| Usuarios (roles) | 🟡 base |
| Asistencia | 🟡 base |
| Pagos | 🟡 base |
| Campeonatos (Kyorugi + Poomsae, pesaje, llaves, credenciales) | 🟡 base |
| Exámenes de grado (candidatos + historial) | ⬜ esquema listo |
| Comunicados | ⬜ esquema listo |

✅ Completo · 🟡 En construcción · ⬜ Pendiente

---

## Diseño

- Paleta: rojo vivo `#E53935` + negro `#1A1A1A` + grises iOS.
- Tipografía: **Inter** (cargada vía `<link>` desde Google Fonts).
- Componentes iOS: cards con *frosted glass*, `ios-tabbar` móvil, `ios-sidebar` oscuro de escritorio, *chips*, *sheets* modales.
- Responsive: escritorio con sidebar izquierda, móvil con tab bar inferior + hamburguesa.
- PWA instalable en iOS/Android.

---

## Autor

Luigi Armando Robles Palacios — practicante UCV · 2026
Bajo supervisión del Mtro. **Christopher Cabrera** (7° DAN · Presidente FPTKD — La Libertad).
