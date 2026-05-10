# Gran Coach LNB — Fantasy Basketball

Juego de Fantasy Basketball de la **Liga Nacional de Básquet de Argentina (LNB)**. Cada jugador arma su equipo con jugadores reales, define titulares y capitán, y acumula puntos según las estadísticas de cada jornada.

> **Estado (v1.3 — 2026-05-10):** MVP completo y jugable end-to-end. 11 bugs corregidos. 102 tests automatizados passing.

---

## Índice

1. [¿Cómo funciona el juego?](#cómo-funciona-el-juego)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Setup rápido](#setup-rápido)
5. [Variables de entorno](#variables-de-entorno)
6. [Carga de datos](#carga-de-datos)
7. [API — Endpoints](#api--endpoints)
8. [Flujos principales](#flujos-principales)
9. [Tests](#tests)
10. [Documentación adicional](#documentación-adicional)

---

## ¿Cómo funciona el juego?

### Flujo de usuario completo

```
1. Registrarse  →  recibís $100M de presupuesto inicial
2. Ir al mercado →  comprás hasta 10 jugadores de la LNB
3. Armar lineup  →  elegís 5 titulares + 1 capitán
4. Esperar       →  el admin carga stats al finalizar cada jornada
5. Ver puntos    →  el sistema calcula tu puntaje automáticamente
6. Ranking       →  competís contra otros usuarios
```

### Reglas del sistema de puntos

| Rol | Multiplicador |
|-----|---------------|
| Capitán | ×2 (solo 1 por equipo, debe ser titular) |
| Titular | ×1 |
| Suplente | ×0.5 |

**Penalizaciones por transferencias:**
- 1ra y 2da transferencia de la jornada: **gratis**
- 3ra transferencia en adelante: **−20 puntos** por operación

### Límites del equipo

| Regla | Límite |
|-------|--------|
| Jugadores en el equipo | máx 10 |
| Jugadores del mismo equipo LNB | máx 3 |
| Titulares | máx 5 |
| Suplentes | máx 5 |
| Capitanes | exactamente 1 (si se asigna) |

### Estadísticas que generan puntos

Las vistas SQL calculan puntos según: **puntos anotados, rebotes, asistencias, robos, tapas, pérdidas y faltas** de cada jugador en cada partido. El backend solo consulta — no calcula.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO / BROWSER                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼─────────────────────────────────────┐
│               FRONTEND  (React 18 + Vite 5)                     │
│   :5173  ──  React Router + TanStack Query + Zustand + Axios    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ proxy /api → :3000 (dev)
┌───────────────────────────▼─────────────────────────────────────┐
│               BACKEND  (Node.js 18 + Express 4)                 │
│   :3000  ──  JWT Auth · Rate Limit · Helmet · CORS              │
│   Rutas: /auth · /fantasy-team · /market · /gameweeks           │
│           /rankings · /admin                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ pg (node-postgres)
┌───────────────────────────▼─────────────────────────────────────┐
│               POSTGRESQL  (con triggers y vistas)               │
│   Triggers: presupuesto · límites · bloqueo por jornada         │
│   Vistas: puntos_fantasy_por_partido · ranking_general_completo  │
└─────────────────────────────────────────────────────────────────┘
                            │ HTTP (rate-limited)
┌───────────────────────────▼─────────────────────────────────────┐
│           api-basketball.com  (datos reales LNB)                │
│   Plan free: 100 req/día · leagueId=18 · season=2024-2025       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura del proyecto

```
GRAN COACH LNB 1.2/
│
├── BACKEND/                        API REST — Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── app.js                  Entry point (middlewares + rutas + cron)
│   │   ├── config/
│   │   │   └── database.js         Pool de conexiones pg + withTransaction()
│   │   ├── middleware/
│   │   │   ├── auth.js             Verifica JWT, hidrata req.user
│   │   │   ├── errorHandler.js     Mapea errores PG → HTTP
│   │   │   └── validate.js         Helper express-validator
│   │   ├── repositories/           Una clase por tabla — SQL parametrizado
│   │   │   ├── UserRepository.js
│   │   │   ├── FantasyTeamRepository.js
│   │   │   ├── PlayerRepository.js
│   │   │   ├── GameweekRepository.js
│   │   │   ├── MatchRepository.js
│   │   │   ├── StatsRepository.js
│   │   │   ├── TransferRepository.js
│   │   │   ├── RankingRepository.js
│   │   │   └── SyncRepository.js
│   │   ├── services/               Lógica de negocio
│   │   │   ├── AuthService.js
│   │   │   ├── MarketService.js    Buy / sell / transfer + penalizaciones
│   │   │   ├── LineupService.js    Titulares / capitán / validaciones
│   │   │   ├── ScoringService.js
│   │   │   ├── SyncService.js      Orquesta sync con api-basketball
│   │   │   ├── ApiBasketballService.js
│   │   │   └── ProgressiveStatsLoaderService.js
│   │   ├── controllers/
│   │   │   ├── AuthController.js
│   │   │   ├── FantasyTeamController.js
│   │   │   ├── MarketController.js
│   │   │   ├── GameweekController.js
│   │   │   ├── RankingController.js
│   │   │   └── AdminController.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── fantasyTeam.js
│   │       ├── market.js
│   │       ├── gameweeks.js        Incluye isAdmin en rutas de escritura
│   │       ├── rankings.js
│   │       └── admin.js
│   ├── migrations/                 8 SQL — aplicar en orden
│   ├── scripts/
│   │   └── generateRealisticStats.js   Stats sintéticas sin consumir cuota
│   ├── tests/                      102 tests — jest + supertest
│   │   ├── auth.test.js            (8 tests)
│   │   ├── market.test.js          (34 tests)
│   │   ├── lineup.test.js          (20 tests)
│   │   ├── gameweeks.test.js       (24 tests)
│   │   └── errorHandler.test.js    (17 tests)
│   ├── backup/                     Scripts de backup + guías
│   ├── .env.example
│   ├── jest.config.js
│   ├── package.json
│   └── README.md
│
├── FRONTEND/                       SPA — React 18 + Vite 5 + TailwindCSS
│   ├── src/
│   │   ├── api/                    Capa HTTP (Axios + interceptores JWT)
│   │   │   ├── axios.js            Cliente con detección de token expirado
│   │   │   ├── auth.js
│   │   │   ├── fantasyTeam.js
│   │   │   ├── market.js
│   │   │   ├── gameweeks.js
│   │   │   ├── rankings.js
│   │   │   └── admin.js
│   │   ├── store/
│   │   │   └── authStore.js        Zustand — token + user en localStorage
│   │   ├── hooks/                  React Query wrappers por dominio
│   │   │   ├── useAuth.js
│   │   │   ├── useTeam.js
│   │   │   ├── useMarket.js
│   │   │   └── useRankings.js
│   │   ├── components/
│   │   │   ├── ui/                 Button, Card, Badge, Spinner, EmptyState
│   │   │   ├── layout/             Navbar, Layout, PrivateRoute, AdminRoute
│   │   │   ├── market/             PlayerCard, PlayerFilters, BudgetBar
│   │   │   ├── team/               LineupGrid, RosterPlayer
│   │   │   └── rankings/           RankingTable
│   │   ├── pages/
│   │   │   ├── Landing.jsx         Home pública
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx        Registro + creación de equipo
│   │   │   ├── Dashboard.jsx       Resumen personal
│   │   │   ├── Market.jsx          Mercado con filtros y paginación
│   │   │   ├── MyTeam.jsx          Roster + gestión de alineación
│   │   │   ├── Rankings.jsx        Ranking global
│   │   │   ├── PlayerDetail.jsx    Stats + puntos fantasy del jugador
│   │   │   └── Admin.jsx           Panel admin (sync + advance gameweek)
│   │   ├── App.jsx                 Rutas + providers
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.js              Proxy /api → :3000 en dev
│   └── README.md
│
├── README.md                       Este archivo
├── ANALISIS_ERRORES.md             11 bugs detectados y resueltos
├── RESUMEN_EJECUTIVO.md            Estado del proyecto v1.3
├── ROADMAP.md                      Plan de iteraciones
├── DOCUMENTACION_TESTS.md          Descripción de los 102 tests
└── SOLUCION_IMPLEMENTADA.md        Guía detallada de los fixes
```

---

## Setup rápido

### Prerequisitos

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- (Opcional) cuenta en [api-basketball.com](https://api-basketball.com) para datos reales

### 1. Clonar

```bash
git clone https://github.com/joaquinlallana/grancoach_lnb_1.2.git
cd grancoach_lnb_1.2
```

### 2. Configurar Backend

```bash
cd BACKEND
npm install
cp .env.example .env
# → Editar .env con tus datos (DB, JWT_SECRET, etc.)
```

### 3. Crear y migrar la base de datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE grancoach_lnb;"

# Restaurar el schema base (dump incluido en backup/)
psql -U postgres grancoach_lnb < backup/backups/backup_grancoach_lnb_*.sql

# Aplicar migraciones en orden
psql -U postgres grancoach_lnb < migrations/add_api_basketball_ids.sql
psql -U postgres grancoach_lnb < migrations/add_codigo_to_equipos_lnb.sql
psql -U postgres grancoach_lnb < migrations/add_unique_index_equipos_lnb.sql
psql -U postgres grancoach_lnb < migrations/fix_unique_indexes_jugadores_partidos.sql
psql -U postgres grancoach_lnb < migrations/remove_redundant_columns.sql
psql -U postgres grancoach_lnb < migrations/create_38_jornadas.sql
psql -U postgres grancoach_lnb < migrations/create_gameweek_simulation.sql
psql -U postgres grancoach_lnb < migrations/fix_bloquear_si_jornada_cerrada.sql
```

### 4. Levantar el Backend

```bash
# En BACKEND/
npm run dev      # desarrollo — nodemon en :3000
npm start        # producción
```

Health check: `GET http://localhost:3000/health` → `{ "status": "ok", "database": "connected" }`

### 5. Configurar y levantar el Frontend

```bash
cd ../FRONTEND
npm install
npm run dev      # :5173 — proxea /api → :3000 automáticamente
```

Abrir: [http://localhost:5173](http://localhost:5173)

---

## Variables de entorno

### Backend (`BACKEND/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DB_HOST` | ✅ | Host de PostgreSQL (ej: `localhost`) |
| `DB_PORT` | ✅ | Puerto de PostgreSQL (ej: `5432`) |
| `DB_NAME` | ✅ | Nombre de la base de datos (`grancoach_lnb`) |
| `DB_USER` | ✅ | Usuario de PostgreSQL |
| `DB_PASSWORD` | ✅ | Contraseña de PostgreSQL |
| `JWT_SECRET` | ✅ | Secreto para firmar tokens JWT (mín 32 chars aleatorios) |
| `JWT_EXPIRES_IN` | ✅ | Duración del token (ej: `7d`) |
| `BCRYPT_ROUNDS` | ✅ | Rounds de hash de contraseña (recomendado: `12`) |
| `PORT` | ✅ | Puerto del servidor (ej: `3000`) |
| `NODE_ENV` | ✅ | `development` o `production` |
| `CORS_ORIGIN` | ✅ | URL del frontend (ej: `http://localhost:5173`) |
| `RATE_LIMIT_WINDOW_MS` | — | Ventana de rate limit en ms (default: `900000`) |
| `RATE_LIMIT_MAX` | — | Máx requests por ventana (default: `100`) |
| `API_BASKETBALL_KEY` | — | API key de api-basketball.com (para datos reales) |
| `API_BASKETBALL_LEAGUE_ID` | — | ID de la LNB en la API (`18`) |
| `API_BASKETBALL_SEASON` | — | Temporada (ej: `2024-2025`) |
| `TESTING_CRON` | — | `true` para activar carga automática de stats cada 10 min |

Generar un JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`FRONTEND/.env`)

Solo necesario para producción. En desarrollo, Vite proxea automáticamente.

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend en producción (ej: `https://api.tudominio.com`) |

---

## Carga de datos

Hay dos opciones para poblar jugadores, partidos y estadísticas:

### Opción A — Datos reales desde api-basketball.com

Requiere `API_BASKETBALL_KEY` válida. Plan free: **100 req/día, 10 req/min**.

```bash
# 1. Registrarte y obtener JWT
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Admin","email":"admin@ejemplo.com","password":"password123"}'

# 2. Promoverte a admin en la DB
psql -U postgres grancoach_lnb \
  -c "UPDATE usuarios SET es_admin = true WHERE email = 'admin@ejemplo.com';"

# 3. Obtener token haciendo login y guardarlo
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ejemplo.com","password":"password123"}' | \
  node -e "process.stdin|x=>console.log(JSON.parse(x).data.token)")

# 4. Sincronizar equipos + jugadores + partidos (~22 requests)
curl -X POST http://localhost:3000/api/admin/sync/all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leagueId":18,"season":"2024-2025"}'

# 5. Cargar stats de una jornada (1 req por partido)
curl -X POST http://localhost:3000/api/admin/sync/all-stats \
  -H "Authorization: Bearer $TOKEN"
```

### Opción B — Stats sintéticas (sin cuota)

Genera estadísticas realistas por posición sin consumir nada de la API externa:

```bash
cd BACKEND
node scripts/generateRealisticStats.js
```

### Avanzar jornadas (testing / desarrollo)

```bash
# Cierra la jornada actual y activa la siguiente
curl -X POST http://localhost:3000/api/gameweeks/admin/advance-week \
  -H "Authorization: Bearer $TOKEN"
```

---

## API — Endpoints

Todas las respuestas siguen el formato:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Descripción del error", "errors": [] }
```

Token JWT: header `Authorization: Bearer <token>`.

### `/api/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/register` | ❌ | Crea usuario + equipo fantasy con $100M |
| `POST` | `/login` | ❌ | Devuelve `{ token, user }` con campo `es_admin` |
| `GET` | `/profile` | ✅ | Perfil del usuario autenticado |
| `PATCH` | `/profile` | ✅ | Cambiar nombre del usuario |
| `POST` | `/change-password` | ✅ | Cambiar contraseña |

### `/api/fantasy-team`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Mi equipo con roster completo |
| `PATCH` | `/nombre` | Renombrar mi equipo |
| `PATCH` | `/lineup` | Actualizar titulares + capitán |
| `GET` | `/transfers` | Historial de transferencias |
| `GET` | `/budget-history` | Auditoría de movimientos de presupuesto |

Payload de `/lineup`:
```json
{
  "jugadores": [
    { "jugadorId": 5,  "esTitular": true,  "esCapitan": true  },
    { "jugadorId": 12, "esTitular": true,  "esCapitan": false },
    { "jugadorId": 7,  "esTitular": false, "esCapitan": false }
  ]
}
```

### `/api/market`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/players` | ❌ | Lista paginada (filtros: `posicion`, `equipo_id`, `q`, `page`, `limit`) |
| `GET` | `/players/:id` | ❌ | Detalle de un jugador |
| `GET` | `/status` | ❌ | Estado del mercado (`ABIERTO` / `CERRADO`) |
| `GET` | `/equipos-lnb` | ❌ | Catálogo de equipos LNB |
| `GET` | `/posiciones` | ❌ | Catálogo de posiciones |
| `POST` | `/buy/:jugadorId` | ✅ | Fichar jugador |
| `DELETE` | `/sell/:jugadorId` | ✅ | Vender jugador |
| `POST` | `/transfer` | ✅ | Transferencia directa (sale + entra en una sola operación) |

### `/api/gameweeks`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | ❌ | Todas las jornadas |
| `GET` | `/current` | ❌ | Jornada activa |
| `GET` | `/:id` | ❌ | Detalle + partidos de la jornada |
| `GET` | `/:id/matches` | ❌ | Partidos de una jornada |
| `GET` | `/:id/snapshot` | ❌ | Alineaciones capturadas al cerrar |
| `GET` | `/:id/ranking` | ❌ | Ranking de esa jornada |
| `POST` | `/` | ✅ admin | Crear jornada |
| `PATCH` | `/:id` | ✅ admin | Editar fechas / lineup lock |
| `POST` | `/:id/lock` | ✅ admin | Cerrar jornada y capturar snapshot |
| `POST` | `/:id/matches` | ✅ admin | Crear partido |
| `PATCH` | `/:id/matches/:id` | ✅ admin | Actualizar resultado |
| `POST` | `/:id/matches/:id/stats` | ✅ admin | Cargar stats de un jugador |
| `POST` | `/admin/advance-week` | ✅ admin | Cierra actual + activa siguiente |

### `/api/rankings`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | ❌ | Ranking general acumulado (paginado) |
| `GET` | `/me` | ✅ | Mi rendimiento por jornada |
| `GET` | `/players/:id/stats` | ❌ | Stats recientes de un jugador |

### `/api/admin` (todos requieren `es_admin = true`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api-status` | Cuota restante de api-basketball |
| `POST` | `/sync/teams` | Sincronizar equipos LNB (1 req) |
| `POST` | `/sync/players` | Sincronizar jugadores (~20 req) |
| `POST` | `/sync/games` | Sincronizar partidos (1 req) |
| `POST` | `/sync/games/:gameApiId/stats` | Stats de un partido (1 req) |
| `POST` | `/sync/all-stats` | Stats de todos los partidos finalizados |
| `POST` | `/sync/all` | Equipos + jugadores + partidos en cadena |

---

## Flujos principales

### Comprar un jugador

```
POST /api/market/buy/:jugadorId
  │
  ├── authenticate  → verifica JWT
  │
  └── MarketService.buyPlayer()
        ├── Verificar equipo del usuario
        ├── Verificar jugador existe y está activo
        ├── Verificar que no esté ya en el equipo
        ├── Verificar presupuesto suficiente
        ├── DB INSERT → trigger controlar_presupuesto() descuenta precio
        ├── DB INSERT → trigger limitar_jugadores_por_equipo() (máx 10)
        ├── DB INSERT → trigger bloquear_si_jornada_cerrada()
        └── Registrar transferencia (con penalización si count > 1)
```

### Actualizar alineación

```
PATCH /api/fantasy-team/lineup
  │
  └── LineupService.updateLineup()
        ├── Validar: máx 1 capitán
        ├── Validar: el capitán debe ser titular
        ├── Validar: al menos 1 titular o capitán
        └── FantasyTeamRepository.updateLineup()
              ├── Quita capitán anterior (si hay uno nuevo)
              └── UPDATE titular/capitán para cada jugador
```

### Cierre de jornada y cálculo de puntos

```
POST /api/gameweeks/admin/advance-week
  │
  ├── Captura snapshot de alineaciones actuales
  ├── Marca jornada como cerrada (mercado bloqueado)
  └── Activa la siguiente jornada

Los puntos se calculan automáticamente por vistas SQL:
  puntos_fantasy_por_partido    → puntos base por actuación
  puntos_jugador_por_jornada    → promedio por jornada
  puntos_equipo_por_jornada     → aplica multiplicadores (×2 / ×1 / ×0.5)
  total_equipo_por_jornada      → suma − penalizaciones de transferencias
  ranking_general_completo      → ranking acumulado de todos los equipos
```

### Sistema de penalizaciones

```
transfersThisWeek > TRANSFERENCIAS_LIBRES_POR_JORNADA (1)

Jornada nueva → count = 0
  1ra operación → count=0 → 0 > 1 = false → LIBRE
  2da operación → count=1 → 1 > 1 = false → LIBRE
  3ra operación → count=2 → 2 > 1 = true  → −20 pts
  4ta operación → count=3 → 3 > 1 = true  → −20 pts
```

---

## Tests

```bash
cd BACKEND
npm test
```

**Resultado:** 102 tests, 5 suites, 0 fallos.

| Suite | Tests | Qué cubre |
|-------|-------|-----------|
| `auth.test.js` | 8 | Registro, login, validaciones, health |
| `market.test.js` | 34 | Compra, venta, transfer, penalizaciones |
| `lineup.test.js` | 20 | Capitán, alineación mínima, validaciones HTTP |
| `gameweeks.test.js` | 24 | Acceso admin en 8 rutas de jornadas |
| `errorHandler.test.js` | 17 | Mapeo errores PG → HTTP, createError |

Ver [DOCUMENTACION_TESTS.md](./DOCUMENTACION_TESTS.md) para descripción de cada test individualmente.

---

## Documentación adicional

| Archivo | Descripción |
|---------|-------------|
| [BACKEND/README.md](./BACKEND/README.md) | Guía completa del backend: endpoints, flujos, setup, producción |
| [FRONTEND/README.md](./FRONTEND/README.md) | Guía del frontend: stack, estructura, auth, setup |
| [ANALISIS_ERRORES.md](./ANALISIS_ERRORES.md) | 11 bugs detectados y resueltos, con el test que verifica cada uno |
| [DOCUMENTACION_TESTS.md](./DOCUMENTACION_TESTS.md) | Descripción individual de los 102 tests automatizados |
| [RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md) | Estado del proyecto, métricas, deuda técnica |
| [ROADMAP.md](./ROADMAP.md) | Plan de iteraciones: completado, en curso, futuro |
| [SOLUCION_IMPLEMENTADA.md](./SOLUCION_IMPLEMENTADA.md) | Detalle técnico de los fixes de lógica de negocio |

---

## Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Base de datos:** PostgreSQL (triggers + vistas SQL para scoring)
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs
- **Validación:** express-validator
- **Seguridad:** Helmet, CORS, express-rate-limit
- **Cron:** node-cron (carga progresiva de stats)
- **Tests:** Jest + Supertest (DB mockeada)

### Frontend
- **Build:** Vite 5
- **Framework:** React 18
- **Routing:** React Router 6
- **Server state:** TanStack Query v5
- **Client state:** Zustand 4
- **HTTP:** Axios (interceptores de JWT y expiración)
- **Forms:** React Hook Form 7
- **UI:** TailwindCSS 3 + Lucide icons
- **Notificaciones:** react-hot-toast

---

## Seguridad

- Contraseñas hasheadas con **bcrypt** (12 rounds)
- Tokens JWT con expiración configurable (default 7 días)
- Rate limiting: 100 req/15min general, 10 req/15min en auth
- Cabeceras HTTP seguras con **Helmet**
- Consultas SQL **parametrizadas** en toda la capa de repositorios
- Validación de input en cada endpoint con express-validator
- Endpoints admin protegidos por middleware `isAdmin` (columna `es_admin` en DB)
- Frontend detecta tokens expirados **antes** de enviar el request (sin round-trip innecesario)

---

## Producción

```bash
# Backend
NODE_ENV=production
JWT_SECRET=<32+ chars aleatorios>
CORS_ORIGIN=https://tudominio.com
npm start

# Frontend
npm run build   # genera dist/
# Servir dist/ con Nginx, Vercel, Netlify, etc.
```

Consideraciones:
- Usar variables de entorno del hosting (no archivo `.env` en producción)
- Configurar cron diario para carga de stats (`ProgressiveStatsLoaderService`) en lugar de `TESTING_CRON=true`
- Monitorización: Sentry para errores, logs estructurados
