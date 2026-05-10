# Fantasy LNB — Frontend

Single-page application del juego de Fantasy Basketball de la Liga Nacional de Básquet (LNB Argentina). Consume la API REST en [`../BACKEND`](../BACKEND).

> **Estado:** MVP completo y jugable end-to-end (login/register, dashboard, mercado, alineación, rankings, panel admin). Auditado y corregido el 2026-05-10. Ver [`../ANALISIS_ERRORES.md`](../ANALISIS_ERRORES.md).

---

## Stack

- **Build:** Vite 5
- **Framework:** React 18
- **Routing:** React Router 6
- **Server state:** TanStack Query v5 (`@tanstack/react-query`)
- **Auth state:** Zustand 4 (persistido en `localStorage`)
- **HTTP:** Axios (con interceptores para JWT y manejo de 401/expiración)
- **Forms:** React Hook Form 7
- **UI:** TailwindCSS 3 + Lucide icons
- **Notificaciones:** react-hot-toast

---

## Estructura

```
src/
├── api/                        Capa HTTP (axios + endpoints por dominio)
│   ├── axios.js                Cliente con interceptores (JWT, expiración, 401)
│   ├── auth.js
│   ├── fantasyTeam.js
│   ├── market.js
│   ├── gameweeks.js
│   ├── rankings.js
│   └── admin.js
├── store/
│   └── authStore.js            Zustand: token + user
├── hooks/
│   ├── useAuth.js              Login/logout helpers
│   ├── useTeam.js              Mi equipo, lineup, transferencias
│   ├── useMarket.js            Buy/sell/transfer + lista de mercado
│   └── useRankings.js          Ranking global, jornada actual
├── components/
│   ├── ui/                     Button, Card, Badge, Spinner, EmptyState
│   ├── layout/                 Navbar, Layout, PrivateRoute, AdminRoute
│   ├── market/                 PlayerCard, PlayerFilters, BudgetBar
│   ├── team/                   RosterPlayer, LineupGrid
│   └── rankings/               RankingTable
├── pages/
│   ├── Landing.jsx             Home pública
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx           Resumen del usuario
│   ├── Market.jsx              Mercado con filtros, paginación, compra/venta
│   ├── MyTeam.jsx              Roster + drag-toggle de titular/capitán
│   ├── Rankings.jsx            Ranking global con paginación
│   ├── PlayerDetail.jsx        Stats + puntos fantasy del jugador
│   └── Admin.jsx               Panel admin (sync, advance gameweek)
├── App.jsx                     Rutas + providers
├── main.jsx                    Entry
└── index.css                   Tailwind directives + reset
```

---

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno (opcional)

Copiar `.env.example` a `.env` si vas a desplegar. En **desarrollo no es necesario** porque Vite proxea `/api` → `http://localhost:3000` (ver `vite.config.js`).

```env
VITE_API_URL=http://localhost:3000
```

### 3. Correr en desarrollo

```bash
npm run dev      # http://localhost:5173
```

Asegurate de que el backend esté corriendo en `http://localhost:3000` y de que `CORS_ORIGIN=http://localhost:5173` esté seteado en el backend.

### 4. Build de producción

```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente para verificar
```

---

## Flujo del usuario (MVP jugable)

1. **Registro** → `/register` (crea usuario + equipo fantasy con $100M).
2. **Dashboard** → resumen: presupuesto, ranking actual, jornada vigente, últimos puntajes.
3. **Mercado** (`/market`) → filtrar por posición/equipo LNB/búsqueda. Comprar hasta 10 jugadores (máx 3 del mismo equipo LNB).
4. **Mi Equipo** (`/team`) → marcar 5 titulares + 1 capitán (×2 puntos), 5 suplentes (×0.5 puntos). El sistema valida que haya al menos 1 titular o capitán.
5. **Cierre de jornada** → cuando admin avanza la jornada (`/admin`), el mercado se bloquea, se calculan puntos y se actualiza el ranking.
6. **Rankings** (`/rankings`) → ver tu posición global y la de los demás equipos.

### Reglas del juego

- 💰 Presupuesto: $100M iniciales.
- 👑 Capitán: ×2 puntos. Solo 1 capitán y debe ser titular.
- ⭐ Titular: ×1 punto. Suplente: ×0.5 punto.
- 🔄 1 transferencia gratis por jornada. A partir de la 2da: −20 puntos de penalización.
- 🔒 Mercado se cierra al lock de cada jornada (configurable, default: 4 días antes del inicio).

---

## Auth

- Token JWT guardado en `localStorage` y agregado automáticamente al header `Authorization` por el interceptor de axios (`src/api/axios.js`).
- **Manejo de expiración**: el interceptor decodifica el JWT antes de cada request. Si está expirado, limpia la sesión y redirige a `/login`.
- En caso de 401 desde el backend, idem.
- Rutas protegidas: `<PrivateRoute>` requiere login. `<AdminRoute>` adicionalmente requiere `user.es_admin === true`.

---

## Mismatches corregidos con el backend

Durante la auditoría 2026-05-10 se verificó:

- ✅ Casing de payload `updateLineup`: frontend envía `{ jugadorId, esTitular, esCapitan }` y backend valida exactamente ese formato.
- ✅ `Register` envía `nombreEquipo` correctamente (camelCase, opcional).
- ✅ Endpoints de admin (`/api/admin/*` y `/api/gameweeks/admin/advance-week`) requieren `es_admin` tanto en frontend (`AdminRoute`) como en backend (middleware `isAdmin`).
- ✅ `PlayerCard` ahora distingue claramente entre "Mercado cerrado" y "Sin fondos".

---

## Testing manual del flujo end-to-end

```
1. Registrarte en /register → debe crear usuario y equipo con $100M
2. Login → /dashboard debe mostrar tus datos
3. Market → comprá 5+ jugadores (validar máx 3 por equipo LNB)
4. MyTeam → marcá 5 titulares + capitán → guardar
5. Admin (si sos admin) → avanzar jornada
6. Rankings → debería mostrar tus puntos y posición
7. Cambiar contraseña en /profile (si está implementado)
8. Logout → debe volver al landing
```

---

## Pendientes / Roadmap

Ver [`../ROADMAP.md`](../ROADMAP.md) para la lista completa. Resumen:

- 🟡 Tests E2E (Playwright o Cypress).
- 🟡 Histórico de puntos por jornada con gráficos.
- 🟡 Comparativa head-to-head entre usuarios.
- 🟡 Mobile-first refinement.

---

## Recursos

- [`../BACKEND/README.md`](../BACKEND/README.md) — API y endpoints disponibles.
- [`./FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md) — guía detallada de implementación inicial.
- [`../ANALISIS_ERRORES.md`](../ANALISIS_ERRORES.md) — bugs detectados y resueltos.
- [`../RESUMEN_EJECUTIVO.md`](../RESUMEN_EJECUTIVO.md) — resumen visual.
- [`../ROADMAP.md`](../ROADMAP.md) — plan de iteraciones.
