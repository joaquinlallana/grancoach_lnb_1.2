# Gran Coach LNB — Frontend

Single-page application del juego de Fantasy Basketball de la Liga Nacional de Básquet (LNB Argentina). Consume la API REST en [`../BACKEND`](../BACKEND).

> **Estado (v1.5 — 2026-05-25):** MVP completo y jugable. **Refactor profesional de UI** aplicado el 2026-05-25: sistema de diseño con tokens semánticos, paleta premium neutra + dorado, tipografía Inter, tema dark/light con toggle, eliminación de iconografía estilo "IA" (emojis decorativos), componentes UI nuevos (Skeleton, Input, FormField, ErrorBoundary, ThemeToggle, Logo) y rediseño completo de las 8 páginas. Ver [`../ROADMAP.md`](../ROADMAP.md) para el detalle de la evolución v1.3 → v1.4 → v1.5.

---

## Stack

- **Build:** Vite 5
- **Framework:** React 18
- **Routing:** React Router 6
- **Server state:** TanStack Query v5 (`@tanstack/react-query`)
- **Auth state:** Zustand 4 (persistido en `localStorage`)
- **Theme state:** Zustand (clase `dark` en `<html>`, persistido)
- **HTTP:** Axios (con interceptores para JWT y manejo de 401/expiración)
- **Forms:** React Hook Form 7
- **UI:** TailwindCSS 3 con `darkMode: 'class'` + design tokens custom + Lucide icons
- **Tipografía:** Inter (vía Google Fonts, pesos 400–800)
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/utilities` (CourtView en Mi Equipo)
- **Notificaciones:** react-hot-toast

---

## Sistema de diseño

El frontend usa un sistema de design tokens definido en `tailwind.config.js` para mantener coherencia visual y soportar dark/light de forma nativa.

### Paleta

```text
brand-*    → escala de dorado (50–950) — accent premium (CTAs, capitán, destaques)
surface-*  → escala neutra (50–950, basada en zinc) — fondos, cards y bordes

Sem-ánticos (uso semántico atenuado, ~10% opacidad + ring):
  emerald → success / mercado abierto
  rose    → danger / mercado cerrado
  amber   → warning / advertencias
  sky     → info (también posición "base")
  indigo  → posición "escolta"
  emerald → posición "alero"
  amber   → posición "ala-pivot"
  rose    → posición "pivot"
```

Las posiciones de jugadores usan distintos hues con la **misma saturación** (ring 1px al 20-30%, fondo al 10%) para diferenciarse de forma tenue, sin saturación gritona.

### Tipografía

- Fuente: **Inter** (Google Fonts, pesos 400/500/600/700/800).
- Escala custom: `text-display-md|lg|xl|2xl` para titulares con `letter-spacing` negativo.
- Tabular numerals (`tabular-nums`) en cualquier dato numérico (precios, puntos, posiciones).

### Componentes UI base (`src/components/ui/`)

| Componente       | Notas                                                                                                 |
|------------------|-------------------------------------------------------------------------------------------------------|
| `Button`         | 6 variantes (primary, secondary, ghost, outline, danger, success), 5 tamaños, `iconLeft`/`iconRight`. |
| `Card` + `CardHeader` | Borde sutil dark/light, padding token, `hover` opcional.                                          |
| `Badge`          | Posiciones + status del mercado. Paleta unificada (ring + tinte).                                      |
| `Spinner` + `PageSpinner` | `role="status"` + label opcional.                                                              |
| `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonRow` | Shimmer animado para placeholders contextuales. |
| `EmptyState`     | Icono + título + descripción + slot para CTA.                                                          |
| `Input`, `Select` | Inputs accesibles con `iconLeft`/`iconRight`, estados `invalid` y focus ring brand.                  |
| `FormField`      | Wrapper accesible: label + control + hint/error con `aria-invalid` y `aria-describedby` automáticos.  |
| `ErrorBoundary`  | Captura crashes con fallback sobrio (botones "Recargar" / "Volver a intentar").                       |
| `ThemeToggle`    | Botón Sun/Moon que alterna `themeStore`.                                                              |
| `Logo`, `Wordmark` | Isótipo SVG escalable (geometría circular con acento dorado) + wordmark de marca.                   |

---

## Tema dark / light

- Toggle en la `Navbar` (icono Sun/Moon). Persistido en `localStorage` bajo la clave `theme`.
- El estado inicial respeta `prefers-color-scheme` y se aplica con un script inline en `index.html` antes del render de React (evita el flash inicial).
- Estrategia Tailwind: `darkMode: 'class'`. Cada componente expresa ambos temas con `dark:` modifiers sobre los tokens `surface-*`.
- Para agregar un componente nuevo:
  1. Usar siempre tokens `surface-*` para fondos/bordes/texto neutros.
  2. Usar `brand-*` para acentos.
  3. Para semánticos, preferir `bg-emerald-500/10 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300` (no colores sólidos saturados).

---

## Estructura

```
src/
├── api/                        Capa HTTP (axios + endpoints por dominio)
│   ├── axios.js                Cliente con baseURL configurable (VITE_API_URL o /api proxy)
│   ├── auth.js
│   ├── fantasyTeam.js          (renameTeam, updateLineup, getTeam, …)
│   ├── market.js
│   ├── gameweeks.js
│   ├── rankings.js
│   └── admin.js
├── store/
│   ├── authStore.js            Zustand: token + user (persistido)
│   └── themeStore.js           Zustand: theme dark/light (persistido)
├── hooks/
│   ├── useAuth.js
│   ├── useTeam.js
│   ├── useMarket.js
│   └── useRankings.js
├── components/
│   ├── ui/                     Sistema de UI (ver tabla arriba)
│   ├── layout/                 Navbar, Layout (con ErrorBoundary), PrivateRoute, AdminRoute
│   ├── market/                 PlayerCard, PlayerFilters, BudgetBar
│   ├── team/                   CourtView (responsive + DnD), PlayerChip
│   ├── rankings/               RankingTable
│   └── dashboard/              StatCard
├── pages/
│   ├── Landing.jsx             Home pública con hero + features
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx           Resumen con stat cards unificados + quick actions
│   ├── Market.jsx              Filtros + skeletons + paginación
│   ├── MyTeam.jsx              CourtView responsive + reglas + transferencias
│   ├── Rankings.jsx            Tabla con skeletons + paginación
│   ├── PlayerDetail.jsx        Stats + fórmula fantasy
│   └── Admin.jsx               Sync + jornada + API status
├── App.jsx                     Rutas + ErrorBoundary global
├── main.jsx                    Entry (theme init + providers + Toaster)
└── index.css                   Tailwind + tokens semánticos + skeleton shimmer
```

---

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno (opcional en dev)

```bash
cp .env.example .env   # solo si vas a desplegar a producción
```

- **Desarrollo:** dejar `.env` sin crear. Vite proxea `/api` → `http://localhost:3000` (ver `vite.config.js`).
- **Producción:** setear `VITE_API_URL` con el origen del backend (sin `/api` al final).

```env
VITE_API_URL=https://api.tudominio.com
```

`src/api/axios.js` concatena `/api` automáticamente si `VITE_API_URL` está definido; de lo contrario usa `/api` relativo.

### 3. Dev server

```bash
npm run dev      # http://localhost:5173
```

Asegurate de que el backend esté en `http://localhost:3000` y `CORS_ORIGIN=http://localhost:5173` en backend.

### 4. Build de producción

```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente para verificar
```

---

## Flujo del usuario

1. **Landing** (`/`) → hero pulido + features + toggle de tema en la top bar.
2. **Registro** → `/register` (formulario unificado con `FormField`). Crea usuario + equipo con $100M. Email de bienvenida si SMTP está habilitado.
3. **Dashboard** → stat cards con paleta unificada (1 acento dorado), banner de jornada sutil, quick actions con iconos Lucide.
4. **Mercado** (`/market`) → filtros (búsqueda + posición + equipo) con clear-all chip, grid de cards con skeletons durante carga, paginación.
5. **Mi Equipo** (`/my-team`) → CourtView **responsive**: en desktop banco + cancha lado a lado; en mobile cancha arriba + banco en grid 5 columnas abajo. Drag-and-drop intacto, paleta de chips sobria, sin glassmorphism roto.
6. **Rankings** → tabla con top-3 destacado con badge dorado sutil (sin emojis 🥇🥈🥉), fila del usuario resaltada con borde lateral acento, skeleton rows durante carga.
7. **Admin** (solo admin) → panel con API status, jornada actual y operaciones de sincronización agrupadas.

---

## Auth

- JWT en `localStorage` + header `Authorization` inyectado por axios.
- Interceptor decodifica el JWT y verifica expiración antes de cada request; si expiró, limpia sesión y redirige a `/login`.
- 401 desde el backend → mismo comportamiento.
- `<PrivateRoute>` requiere login; `<AdminRoute>` adicionalmente requiere `user.es_admin === true`.

---

## Manejo de errores

- `ErrorBoundary` global envuelve toda la app en `App.jsx`. Captura crashes de render y muestra un fallback sobrio con opción de recargar.
- `ErrorBoundary` adicional dentro de `Layout.jsx` aísla las páginas privadas: si una de ellas crashea, el navbar y el ErrorBoundary global se mantienen funcionales.
- React Query maneja errores de async; los hooks usan `toast.error()` con `err.response?.data?.message` en sus `onError`.

---

## Reglas del juego

- Presupuesto: **$100M** iniciales.
- Capitán: **×2 puntos**. Solo 1 capitán y debe ser titular.
- Titular: ×1 punto. Suplente: ×0.5 punto.
- 2 transferencias gratis por jornada. A partir de la 3ra: −20 puntos por operación.
- Mercado se cierra al lock de cada jornada.

---

## Testing manual del flujo end-to-end

```text
1. Toggle de tema en Landing → cambia y persiste tras recarga.
2. Registrarte en /register → debe crear usuario + equipo con $100M.
3. Login → /dashboard muestra tus stats sin emojis, paleta unificada.
4. /market → comprá 5+ jugadores; ver skeletons durante carga.
5. /my-team → CourtView debe ser responsive (probar 360px / 768px / 1024px).
6. /admin (si admin) → ver API status, avanzar jornada.
7. /rankings → top 3 en badges dorados, tu fila resaltada con borde lateral.
8. Logout → vuelve al landing público.
9. Forzar 401 (borrar token en DevTools y hacer un fetch) → redirect a /login.
10. Provocar un error de render → ErrorBoundary muestra fallback.
```

---

## Pendientes / Roadmap

Ver [`../ROADMAP.md`](../ROADMAP.md). Resumen:

- 🟡 Tests E2E (Playwright o Cypress).
- 🟡 Histórico de puntos por jornada con gráficos (sparkline).
- 🟡 Comparativa head-to-head entre usuarios.
- 🟡 Drag-and-drop dentro del banco (reordenar suplentes).
- 🟡 Recuperar contraseña (endpoint backend pendiente).
- 🟡 Opt-out granular de emails desde `/profile`.

---

## Recursos

- [`../BACKEND/README.md`](../BACKEND/README.md) — API y endpoints disponibles.
- [`./FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md) — guía detallada de implementación.
- [`../ANALISIS_ERRORES.md`](../ANALISIS_ERRORES.md) — bugs detectados y resueltos.
- [`../ROADMAP.md`](../ROADMAP.md) — plan de iteraciones.
