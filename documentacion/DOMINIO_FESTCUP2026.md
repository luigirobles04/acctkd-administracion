# festcup2026.com — Configuración completa

Dominio comprado en **Hostinger**. Toda la plataforma ACCTKD vive en un solo sitio:

| URL | Módulo |
|-----|--------|
| https://festcup2026.com | Landing FestCup |
| https://festcup2026.com/login | Login (admin, árbitro, representantes) |
| https://festcup2026.com/admin/* | Panel administración |
| https://festcup2026.com/arbitro | Mesa / árbitro |
| https://festcup2026.com/portal/* | Portal academias |
| https://festcup2026.com/campeonato/* | TV en vivo, podios |
| https://festcup2026.com/api/* | APIs (PSS, llaves, etc.) |

---

## Paso 1 — Vercel: añadir dominio

1. [vercel.com](https://vercel.com) → proyecto **acctkd-administracion**
2. **Settings → Domains → Add**
3. Añade:
   - `festcup2026.com`
   - `www.festcup2026.com`
4. Marca **`festcup2026.com`** como **Primary domain**

---

## Paso 2 — Hostinger: DNS

1. hPanel → **Dominios** → `festcup2026.com` → **Administrar**
2. **DNS / Zona DNS**
3. Elimina registros A/CNAME que apunten a parking de Hostinger (si existen)
4. Añade o edita:

| Tipo | Nombre / Host | Valor | TTL |
|------|---------------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |

> Si Vercel muestra valores distintos al añadir el dominio, **usa los de Vercel** (son los oficiales).

5. Guarda y espera 15 min – 24 h (normalmente < 1 h).

---

## Paso 3 — Vercel: variables de entorno

**Settings → Environment Variables → Production:**

```
NEXT_PUBLIC_APP_URL=https://festcup2026.com
```

Verifica también:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PSS_API_SECRET` (token producción PSS)

Luego **Deployments → Redeploy** (último commit).

---

## Paso 4 — Verificar

- https://festcup2026.com → landing
- https://festcup2026.com/login → login
- https://festcup2026.com/admin/dashboard → admin (tras login)
- https://festcup2026.com/robots.txt
- https://festcup2026.com/sitemap.xml
- https://www.festcup2026.com → redirige a sin www
- https://acctkd-administracion-an52.vercel.app → redirige a festcup2026.com

---

## Paso 5 — Google Search Console

1. https://search.google.com/search-console
2. **Añadir propiedad** → `festcup2026.com`
3. Verificación por **registro TXT** en Hostinger DNS (Google te da el valor)
4. Tras verificar: **Sitemaps** → enviar `https://festcup2026.com/sitemap.xml`

---

## Paso 6 — PSS FESTCUP (laptops)

Unity → **COLA ACCTKD**:
- URL API: `https://festcup2026.com`
- Token PSS: el configurado en `PSS_API_SECRET`

---

## SEO implementado en código

- `metadataBase` + Open Graph + Twitter cards
- `robots.txt` (bloquea `/admin`, `/login`, `/api`)
- `sitemap.xml` dinámico (campeonatos públicos)
- JSON-LD SportsEvent en home
- Redirect www + dominio Vercel antiguo

---

## Soporte

Si el dominio no resuelve tras 2 h:
- Hostinger → DNS → confirma que no hay **nameservers** de parking
- Vercel → Domains → estado debe ser **Valid**
