# Fantasy LNB — Backend API

API REST para el juego de Fantasy Basketball de la Liga Nacional de Básquet (LNB Argentina).

> **Estado:** Backend MVP **completo y jugable** (v1.2). Todos los bugs críticos de lógica de negocio fueron corregidos. Frontend React/Vite ya disponible en [`../FRONTEND`](../FRONTEND). Faltan tests amplios y datos reales sembrados (ver [ROADMAP.md](../ROADMAP.md) y [ANALISIS_ERRORES.md](../ANALISIS_ERRORES.md)).
>
> **Última auditoría:** 2026-05-10 — 9 bugs corregidos (penalización transferencias, alineación mínima, transacciones, jornada obligatoria, presupuesto, doble fetch, isAdmin en gameweeks, manejo de token, otros). Ver [ANALISIS_ERRORES.md](../ANALISIS_ERRORES.md) y [RESUMEN_EJECUTIVO.md](../RESUMEN_EJECUTIVO.md).

---

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **DB:** PostgreSQL 18+ (con triggers, funciones y vistas — todo el cálculo de puntos y validaciones vive en la DB)
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs
- **Validación:** express-validator
- **Seguridad:** helmet, cors, express-rate-limit
- **Cron:** node-cron (carga progresiva de stats opcional)
- **Email:** nodemailer + **Mailtrap SMTP** (`live.smtp.mailtrap.io:587`)
- **Sync externa:** api-basketball.com (LNB `leagueId=18`, plan free 100 req/día, 10 req/min)

---

## Estructura del proyecto

```
src/
├── config/database.js                 Pool de conexiones PG
├── middleware/
│   ├── auth.js                        Verifica JWT, hidrata req.user (incluye es_admin)
│   ├── errorHandler.js                Manejo global (mapea errores PG a HTTP)
│   └── validate.js                    Helper express-validator
├── repositories/                      SQL parametrizado, 1 clase por tabla principal
│   ├── UserRepository.js
│   ├── FantasyTeamRepository.js
│   ├── PlayerRepository.js
│   ├── GameweekRepository.js
│   ├── MatchRepository.js
│   ├── StatsRepository.js
│   ├── TransferRepository.js
│   ├── RankingRepository.js
│   └── SyncRepository.js
├── services/                          Lógica de negocio
│   ├── AuthService.js
│   ├── MarketService.js
│   ├── LineupService.js
│   ├── ScoringService.js
│   ├── SyncService.js                 Orquesta sync con api-basketball
│   ├── ApiBasketballService.js        Cliente HTTP rate-limited
│   └── ProgressiveStatsLoaderService.js  Carga jornada por jornada respetando cuota
├── controllers/
│   ├── AuthController.js
│   ├── FantasyTeamController.js
│   ├── MarketController.js
│   ├── GameweekController.js          Incluye advanceGameweek (testing)
│   ├── RankingController.js
│   └── AdminController.js             Sincronización admin
├── routes/
│   ├── auth.js
│   ├── fantasyTeam.js
│   ├── market.js
│   ├── gameweeks.js
│   ├── rankings.js
│   └── admin.js
└── app.js                             Entry point + cron opcional

migrations/                            8 SQL aplicables en orden (ver ESTADO_PROYECTO.md)
scripts/generateRealisticStats.js      Genera stats sintéticas sin consumir cuota
backup/                                Dumps + guías de backup
tests/                                 Solo auth.test.js por ahora
```

---

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copiar `.env.example` a `.env` y completar:

```env
# DB
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grancoach_lnb
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=al_menos_32_chars_aleatorios
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server
PORT=3000
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:5173

# api-basketball.com
API_BASKETBALL_KEY=tu_key
API_BASKETBALL_LEAGUE_ID=18
API_BASKETBALL_SEASON=2024-2025

# Emails (opcional — ver sección Email más abajo)
EMAILS_ENABLED=false
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=tu_mailtrap_api_token

# Cron de carga progresiva (opcional)
TESTING_CRON=false
```

### 3. Base de datos

```bash
# Crear DB y restaurar el dump base
psql -U postgres -c "CREATE DATABASE grancoach_lnb;"
psql -U postgres grancoach_lnb < dump.sql

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

### 4. Levantar el servidor

```bash
npm run dev      # nodemon (desarrollo)
npm start        # producción
npm test         # jest (solo auth por ahora)
```

Health check: `GET http://localhost:3000/health` → `{ status: "ok", database: "connected" }`.

---

## Carga de datos

Hay dos caminos para poblar jugadores, partidos y estadísticas. Las migraciones ya crearon las 38 jornadas; falta sincronizar el resto.

### Opción A — Sincronización real con api-basketball

Necesita `API_BASKETBALL_KEY` válida. Plan free: **100 req/día, 10 req/min**.

```bash
# 0. Crear el primer admin (después de registrarte vía /api/auth/register)
psql -U postgres grancoach_lnb -c "UPDATE usuarios SET es_admin = true WHERE email = 'tu@email.com';"

# 1. Verificar cuota
curl http://localhost:3000/api/admin/api-status -H "Authorization: Bearer $JWT"

# 2. Sincronizar todo (equipos + jugadores + partidos, ~22 requests)
curl -X POST http://localhost:3000/api/admin/sync/all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"leagueId": 18, "season": "2024-2025"}'

# 3. Cargar stats progresivamente (rate-limit interno: 1 req cada 6s)
#    Usar el cron automático:
TESTING_CRON=true npm run dev   # carga 1 jornada cada 10 minutos
#    O invocar manualmente:
node -e "require('./src/services/ProgressiveStatsLoaderService').loadGameweekStats(1).then(console.log)"
```

> Nota: los jugadores sincronizados quedan con `posicion='base'` y precio fijo por posición. La asignación real de posiciones y precios es manual (ver ROADMAP).

### Opción B — Datos sintéticos (sin cuota)

Para validar scoring end-to-end sin tocar la API externa:

```bash
node scripts/generateRealisticStats.js
```

Genera stats realistas por posición (titulares vs suplentes) para todos los partidos finalizados que ya estén en la BD.

### Avanzar jornadas (testing)

```bash
# Cierra la jornada actual y activa la siguiente, recalcula vistas
curl -X POST http://localhost:3000/api/gameweeks/admin/advance-week \
  -H "Authorization: Bearer $JWT"
```

---

## Endpoints

Todas las respuestas siguen el formato:

```json
{ "success": true, "data": ... }
{ "success": false, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }
```

Token JWT: header `Authorization: Bearer <token>`.

### `/api/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register` | ❌ | Crea usuario + equipo fantasy ($100M presupuesto) |
| POST | `/login` | ❌ | Devuelve `{ token, user }` con `es_admin` |
| GET | `/profile` | ✅ | Perfil propio |
| PATCH | `/profile` | ✅ | Cambiar nombre |
| POST | `/change-password` | ✅ | Cambiar contraseña |

### `/api/fantasy-team`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Mi equipo con roster completo |
| PATCH | `/nombre` | Renombrar equipo |
| PATCH | `/lineup` | Actualizar titulares + capitán |
| GET | `/transfers` | Historial de transferencias |
| GET | `/budget-history` | Auditoría de presupuesto |

```json
PATCH /api/fantasy-team/lineup
{
  "jugadores": [
    { "jugadorId": 5,  "esTitular": true,  "esCapitan": true },
    { "jugadorId": 12, "esTitular": false }
  ]
}
```

### `/api/market`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/players` | ❌ | Lista paginada (filtros `posicion`, `equipo_id`, `q`, `page`, `limit`) |
| GET | `/players/:id` | ❌ | Detalle de jugador |
| GET | `/status` | ❌ | Estado del mercado (ABIERTO/CERRADO) |
| GET | `/equipos-lnb` | ❌ | Catálogo de equipos LNB |
| GET | `/posiciones` | ❌ | Catálogo de posiciones |
| POST | `/buy/:jugadorId` | ✅ | Fichar (validaciones por trigger) |
| DELETE | `/sell/:jugadorId` | ✅ | Vender |
| POST | `/transfer` | ✅ | Transferencia directa (sale + entra) |

### `/api/gameweeks`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ❌ | Todas las jornadas |
| GET | `/current` | ❌ | Jornada activa |
| GET | `/:id` | ❌ | Detalle + partidos |
| GET | `/:id/matches` | ❌ | Partidos de la jornada |
| GET | `/:id/snapshot` | ❌ | Snapshot de alineaciones (post-lock) |
| GET | `/:id/ranking` | ❌ | Ranking de la jornada |
| GET | `/:id/matches/:partidoId/stats` | ❌ | Stats de un partido |
| POST | `/` | ✅ | Crear jornada |
| PATCH | `/:id` | ✅ | Editar fechas / lineupLock |
| POST | `/:id/lock` | ✅ | Cerrar jornada y capturar snapshot |
| POST | `/:id/matches` | ✅ | Crear partido |
| PATCH | `/:id/matches/:partidoId` | ✅ | Actualizar resultado |
| POST | `/:id/matches/:partidoId/stats` | ✅ | Cargar stats de jugador |
| POST | `/admin/advance-week` | ✅ admin | Cierra actual + activa siguiente (testing) |

### `/api/rankings`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ❌ | Ranking general acumulado paginado |
| GET | `/me` | ✅ | Mi rendimiento por jornada |
| GET | `/players/:jugadorId/stats` | ❌ | Stats recientes del jugador |

### `/api/admin` (todos requieren JWT + `es_admin=true`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api-status` | Cuota restante de api-basketball |
| GET | `/leagues/search` | Buscar leagueId por nombre/país |
| POST | `/sync/teams` | Sincronizar equipos (1 req) |
| POST | `/sync/players` | Sincronizar jugadores (~20 req) |
| POST | `/sync/games` | Sincronizar partidos (1 req) |
| POST | `/sync/games/:gameApiId/stats` | Stats de un partido (1 req) |
| POST | `/sync/all-stats` | Stats de todos los partidos finalizados (cuidado con cuota) |
| POST | `/sync/all` | Equipos + jugadores + partidos en cadena |

---

## Flujos importantes

### Compra de jugador

1. `POST /api/market/buy/:jugadorId`.
2. El servicio verifica: mercado abierto, jugador activo, no duplicado.
3. La DB ejecuta los triggers:
   - `bloquear_si_jornada_cerrada()` — impide si el lock está activo.
   - `limitar_jugadores_por_equipo()` — máx 10 jugadores.
   - `limitar_jugadores_por_equipo_lnb()` — máx 3 del mismo equipo LNB.
   - `controlar_presupuesto()` — descuenta precio automáticamente.
4. Si es la 2ª+ transferencia de la jornada, se registra penalización de 20 pts.

### Cierre de jornada

1. `POST /api/gameweeks/:id/lock` (o `advance-week` para cerrar la actual y avanzar).
2. Se invoca `SELECT capturar_lineup_snapshot(jornada_id)` en la DB.
3. La DB copia las alineaciones a `lineup_snapshots` y marca la jornada como cerrada.
4. El trigger bloquea cualquier modificación de equipos a partir de ese momento.

### Cálculo de puntaje

Lo realiza la base de datos mediante vistas:

- `puntos_fantasy_por_partido` — puntos base por actuación.
- `puntos_jugador_por_jornada` — promedio por jornada.
- `puntos_equipo_por_jornada` — aplica ×1 (titular) / ×0.5 (suplente) / ×2 (capitán).
- `total_equipo_por_jornada` — suma total menos penalizaciones.
- `ranking_general_completo` — ranking acumulado.

---

## Seguridad

- Contraseñas con **bcrypt** (12 rounds).
- Tokens JWT con expiración configurable.
- Rate limiting general (100 req/15min) y estricto en auth (10/15min).
- **Helmet** para cabeceras HTTP.
- Consultas parametrizadas en toda la capa de repositorios.
- Validación en cada endpoint con express-validator.
- Endpoints admin protegidos por `es_admin` en la columna de usuarios.

---

## Email (Mailtrap SMTP)

El sistema envía emails transaccionales mediante **Mailtrap** (`live.smtp.mailtrap.io:587`, STARTTLS).

Por defecto los emails están **deshabilitados** (`EMAILS_ENABLED=false`). Para activarlos:

1. Crear cuenta en [mailtrap.io](https://mailtrap.io)
2. Verificar un dominio de envío → pestaña **Integrations** → **SMTP** → copiar el API token
3. Configurar `.env`:

```env
EMAILS_ENABLED=true
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=tu_api_token_de_mailtrap
SMTP_FROM="Gran Coach LNB <noreply@tu-dominio.com>"
FRONTEND_URL=http://localhost:5173
```

Al arrancar con emails habilitados, el servidor verifica la conexión SMTP y lo reporta en consola.

Emails que se envían automáticamente:

| Evento | Función |
|--------|---------|
| Registro de usuario | `sendWelcome` |
| Compra / venta / transferencia | `sendMarketChange` |
| Guardado de alineación | `sendLineupUpdate` |
| Apertura del mercado | `sendWindowOpen` |
| Cierre del mercado | `sendWindowClose` |
| Ranking semanal (lunes 00:00 UTC) | `sendWeekendRanking` |

Ver documentación detallada: [MAILTRAP_INTEGRATION.md](./MAILTRAP_INTEGRATION.md)

---

## Producción

1. `NODE_ENV=production`.
2. `JWT_SECRET` ≥ 32 caracteres aleatorios.
3. `CORS_ORIGIN` apuntando al dominio del frontend.
4. Cron diario para `ProgressiveStatsLoaderService` (en lugar de `TESTING_CRON`).
5. Considerar refresh tokens si se necesitan sesiones largas.
6. Monitorización (Sentry, logs estructurados).

---

## Recursos

- [ESTADO_PROYECTO.md](./ESTADO_PROYECTO.md) — estado real, bugs resueltos, migraciones.
- [../ROADMAP.md](../ROADMAP.md) — qué está hecho y qué sigue (versión raíz, autoritativa).
- [../ANALISIS_ERRORES.md](../ANALISIS_ERRORES.md) — bugs detectados, todos resueltos en la última auditoría.
- [../RESUMEN_EJECUTIVO.md](../RESUMEN_EJECUTIVO.md) — resumen visual de los fixes aplicados.
- [Documentacion_Base_de_Datos_GranCoach_2.0.md](./Documentacion_Base_de_Datos_GranCoach_2.0.md) — schema completo.
- [MAILTRAP_INTEGRATION.md](./MAILTRAP_INTEGRATION.md) — configuración y uso del servicio de emails.
- [backup/BACKUP_GUIDE.md](./backup/BACKUP_GUIDE.md) — guía de respaldo.

---

## Cambios recientes (v1.2 — auditoría 2026-05-10)

- ✅ **MarketService**: penalización de transferencias arreglada (`>=` → `>`), validaciones de presupuesto y jornada obligatoria, validación de `rowCount` en `transferPlayer`.
- ✅ **LineupService**: validaciones de capitán único, capitán titular, mínimo 1 titular.
- ✅ **AuthService**: `changePassword` consolidado a 1 query (antes hacía 2 fetches innecesarios).
- ✅ **routes/gameweeks.js**: todas las rutas de creación/edición ahora protegidas con `isAdmin` (antes solo requerían `authenticate`).
- ✅ **MarketService.transferPlayer**: validaciones explícitas previas a las queries (jugador entra existe, jugador sale en equipo, no duplicados, presupuesto suficiente).
