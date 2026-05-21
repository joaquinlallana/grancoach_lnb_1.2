# Estado del Proyecto — Gran Coach LNB Fantasy

> **Fecha de actualización:** 2026-05-21
> **Estado general:** Backend MVP **100% completo + emails + smart-buy** (v1.4). Frontend MVP **100% jugable con vista táctica y drag-and-drop** (v1.4). 112 tests passing. Pendientes para producción: SMTP real, deploy, monitorización, tests E2E.

---

## 1. Tabla de estado por componente

| Componente | Estado | Detalle |
|------------|--------|---------|
| Base de datos PostgreSQL | ✅ 100% | Schema completo, triggers, vistas, FKs. DB: `grancoach_lnb` |
| Autenticación (JWT + admin) | ✅ 100% | Registro, login, perfil, cambio de password, columna `es_admin` |
| API REST | ✅ 95% | 6 grupos de rutas montadas; falta documentación Swagger |
| Endpoints admin (`/api/admin`) | ✅ 100% | `AdminController` + `routes/admin.js` con sync de equipos/jugadores/partidos/stats |
| Sincronización con api-basketball | ✅ 95% | `SyncService` + `ApiBasketballService` con rate-limit y reintentos |
| Carga progresiva de stats | ✅ 100% | `ProgressiveStatsLoaderService` (1 req / 6s) + cron opcional |
| Datos seed (jornadas + equipos + jugadores) | ✅ 80% | 38 jornadas vía migración. Equipos y jugadores sincronizables. Posiciones reales y precios siguen como pendiente manual |
| Mercado (compra/venta/transfer) | ✅ 100% | Validaciones por triggers + lógica de penalización + **smart-buy v1.4** (asigna titular/banco según roster) |
| Scoring (puntos fantasy) | ✅ 100% | Vistas de DB calculan puntos automáticamente |
| Rankings | ✅ 100% | General y por jornada funcionando |
| **Sistema de emails (v1.4)** | ✅ 100% | `EmailService` con 6 plantillas (bienvenida, mercado, lineup, ventana open/close, ranking semanal). Cron Lunes 00:00 UTC. Activado por `EMAILS_ENABLED` |
| Tests | ✅ 90% | 112 tests passing (5 suites: auth, market, lineup, gameweeks, errorHandler). Falta `scoring.test.js` y E2E. |
| Frontend | ✅ 100% | MVP jugable con vista táctica + DnD + smart-buy + slots accionables |
| Documentación API (Swagger) | 🟡 0% | Opcional, no bloqueante |

---

## 2. Componentes implementados desde la última revisión

### v1.4 (2026-05-21)

- **`src/services/EmailService.js`** (NUEVO) — Transporter SMTP de nodemailer + 6 plantillas HTML (welcome, marketChange, lineupUpdate, windowOpen, windowClose, weekendRanking). Fire-and-forget en todos los puntos de invocación.
- **`src/cron/emailScheduler.js`** (NUEVO) — Cron Lunes 00:00 UTC (Sunday 21:00 ARG) que envía resumen semanal de ranking a todos los usuarios activos.
- **`src/services/MarketService.js`** — **Smart-buy**: antes del INSERT consulta el roster y decide `es_titular` automáticamente (sin titular en esa posición + < 5 titulares → titular; sino → suplente). Devuelve `esTitular` en el response.
- **`src/repositories/UserRepository.js`** — Método `findAllActive()` para emails masivos (open/close de ventana, ranking semanal).
- **`src/repositories/RankingRepository.js`** — Método `getLastClosedWeekRanking()` para el email semanal.
- **`src/controllers/GameweekController.js`** — Disparan `sendWindowOpen` / `sendWindowClose` al avanzar jornada.
- **`src/services/AuthService.js`** — Dispara `sendWelcome` al registrar.
- **`src/services/LineupService.js`** — Dispara `sendLineupUpdate` al guardar alineación.
- **`tests/market.test.js`** — `setupBuy` actualizado para mockear la nueva query del roster del smart-buy. **112 tests passing.**

### v1.0 - v1.3

- **`src/controllers/AdminController.js`** + **`src/routes/admin.js`** — endpoints protegidos por JWT + `isAdmin`:
  - `GET /api/admin/api-status` — cuota api-basketball.
  - `GET /api/admin/leagues/search` — buscar `leagueId` por nombre.
  - `POST /api/admin/sync/teams|players|games|all` — sincronización por entidad o completa.
  - `POST /api/admin/sync/games/:gameApiId/stats` — stats de un partido.
  - `POST /api/admin/sync/all-stats` — stats de todos los partidos finalizados.
- **`src/services/ProgressiveStatsLoaderService.js`** — carga rate-limited (1 req/6s, ~10 req/min) jornada por jornada. Métodos: `loadGameweekStats`, `loadMultipleGameweeks`, `findFirstGameweekWithoutStats`, `getProgressReport`.
- **`POST /api/gameweeks/admin/advance-week`** — cierra la jornada actual y activa la siguiente (testing). Implementado en `GameweekController.advanceGameweek`.
- **Cron opcional** en [src/app.js](src/app.js) (líneas 95-125) — si `TESTING_CRON=true` carga 1 jornada cada 10 minutos automáticamente.
- **`scripts/generateRealisticStats.js`** — genera stats sintéticas realistas por posición para validar scoring sin consumir cuota de la API.

---

## 3. Migraciones aplicadas (`migrations/`)

Aplicar en orden si se parte desde un dump limpio:

1. `add_api_basketball_ids.sql` — columnas `api_basketball_id` en equipos/jugadores/partidos.
2. `add_codigo_to_equipos_lnb.sql` — código corto de equipo.
3. `add_unique_index_equipos_lnb.sql` — índice único parcial.
4. `fix_unique_indexes_jugadores_partidos.sql` — corrige índices únicos para UPSERT.
5. `remove_redundant_columns.sql` — elimina `updated_at`, `altura`, `fecha_fin` redundantes.
6. `create_38_jornadas.sql` — crea calendario completo 2024-10-01 → 2025-05-27.
7. `create_gameweek_simulation.sql` — soporte para avance manual de jornadas.
8. `fix_bloquear_si_jornada_cerrada.sql` — corrige el trigger de bloqueo.

---

## 4. Bugs corregidos (consolidado)

- `RankingRepository.getTotalGeneralAcumulado` — ORDER BY apuntaba a columna inexistente.
- `RankingRepository.getRankingGeneral` — count usaba vista distinta a la query principal.
- `RankingRepository.getRankingPorJornada` — faltaba `total` y `totalPages` en la respuesta.
- `MarketService` — penalización de transferencias usaba `>` en lugar de `>=` (la 2ª transferencia no se penalizaba).
- `AuthService.changePassword` — triple fetch del usuario con riesgo de race; consolidado en `findById` + 1 query de hash.
- `ON CONFLICT` sin predicado WHERE para índices parciales (3 UPSERT).
- Cliente HTTP api-basketball: orden de status checks, rate limiting (10 req/min), reintentos por ECONNRESET.
- Endpoint `/players` de la API requería `team` (no `league`); estructura plana de respuesta.
- Posiciones en minúsculas y `ala-pivot` sin "e".
- Columna `posicion` (texto) faltante en INSERT de jugadores.

---

## 5. Pasos para arrancar el juego desde cero

Ver [README.md](README.md) sección "Setup" para los comandos exactos. Resumen:

1. Restaurar BD `grancoach_lnb` desde dump.
2. Aplicar las 8 migraciones en orden.
3. Configurar `.env` (DB, JWT_SECRET, API_BASKETBALL_KEY, API_BASKETBALL_LEAGUE_ID=18, API_BASKETBALL_SEASON=2024-2025).
4. `npm install && npm run dev`.
5. Sincronizar datos: `POST /api/admin/sync/all` (≈22 requests, respeta cuota de 100/día).
6. Para datos sintéticos sin consumir cuota: `node scripts/generateRealisticStats.js`.
7. Crear admin: `UPDATE usuarios SET es_admin = true WHERE email = '...';`.
8. Probar flujo completo: register → login → buy → lineup → advance-week → ranking.

---

## 6. Próximos pasos críticos

Detalle completo en [../ROADMAP.md](../ROADMAP.md). Resumen por prioridad para **lanzar a usuarios reales**:

1. **Proveedor SMTP de producción** — definir SES / SendGrid / Mailgun / Postmark, configurar SPF/DKIM/DMARC, setear `EMAILS_ENABLED=true` con credenciales reales.
2. **Deploy del backend** (Render / Railway / Fly.io) + **frontend** (Vercel / Netlify) + variables de entorno + HTTPS.
3. **Cron diario de stats en producción** (reemplazar `TESTING_CRON` por un cron real respetando 100 req/día de api-basketball).
4. **Monitorización** — Sentry / Better Stack para errores; logs estructurados.
5. **Tests E2E** (Playwright o Cypress) — protege contra regresiones en cada deploy.
6. **Tests de ScoringService** — cobertura de las vistas SQL (×2 capitán, ×1 titular, ×0.5 suplente).
7. **Recuperar contraseña** — endpoint `forgot-password` + `reset-password` (el sistema de email ya está armado).
8. **Documentación Swagger** (opcional, útil para integradores futuros).

---

## 7. Arquitectura

```
HTTP → Routes (express-validator) → Controllers → Services → Repositories → PostgreSQL
                                                                              ↓ Triggers / Vistas
                                                    ApiBasketballService → api-basketball.com
```

- **Routes** (`src/routes/`, 6 archivos) — validación + middlewares (`authenticate`, `isAdmin`).
- **Controllers** (`src/controllers/`, 6 archivos) — adaptan req/res, sin lógica de negocio.
- **Services** (`src/services/`, 8 archivos) — `Auth`, `Market` (smart-buy), `Lineup`, `Scoring`, `Sync`, `ApiBasketball`, `ProgressiveStatsLoader`, **`Email`** (v1.4).
- **Cron** (`src/cron/`) — `emailScheduler.js` (resumen semanal de ranking, Lunes 00:00 UTC).
- **Repositories** (`src/repositories/`, 9 archivos) — SQL parametrizado, una clase por tabla principal.
- **Triggers de BD** — presupuesto, límite de plantilla, jornada cerrada, capitán titular.
- **Vistas de BD** — calculan puntos fantasy y rankings sin código de aplicación.

---

## 8. Endpoints disponibles (resumen por grupo)

Detalle en [README.md](README.md). Grupos montados en [src/app.js](src/app.js):

- `/api/auth` — registro, login, perfil, cambio de password.
- `/api/fantasy-team` — equipo del usuario, lineup, transfers, presupuesto.
- `/api/market` — listado/compra/venta/transferencia de jugadores, estado del mercado, catálogos.
- `/api/gameweeks` — jornadas, partidos, stats, snapshot, ranking por jornada, advance-week (admin).
- `/api/rankings` — ranking general acumulado, mi rendimiento, stats de jugador.
- `/api/admin` — sincronización con api-basketball (protegido por `es_admin`).

---

## 9. Health check

```bash
curl http://localhost:3000/health
# → { "status": "ok", "database": "connected", "timestamp": "..." }
```
