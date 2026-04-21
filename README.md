# ACCTKD · Administración

Sistema administrativo web para **Christopher Cabrera Tae Kwon Do** (Trujillo, Perú).
Gestiona alumnos, maestros, asistencias, pagos, exámenes de grado, comunicados y campeonatos abiertos (Kyorugi + Poomsae).

> Proyecto académico de práctica profesional · Universidad César Vallejo · 2026

---

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Estilos:** Tailwind CSS v4 + sistema de diseño iOS propio (`globals.css`)
- **BaaS:** Supabase (PostgreSQL + RLS + Storage)
- **PWA:** `next-pwa` + `manifest.json`
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

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus valores de Supabase

# 3. Levantar el servidor de desarrollo
npm run dev
# Abre http://localhost:3000
```

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
